package com.neurolint.plugin.services;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.diagnostic.Logger;
import com.neurolint.plugin.settings.NeuroLintSettings;
import okhttp3.*;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public final class NeuroLintService {
    
    private static final Logger LOG = Logger.getInstance(NeuroLintService.class);
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient client;
    private final Gson gson;
    
    public NeuroLintService() {
        this.client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build();
        this.gson = new Gson();
    }
    
    public static NeuroLintService getInstance() {
        return ApplicationManager.getApplication().getService(NeuroLintService.class);
    }
    
    public CompletableFuture<AnalysisResult> analyzeCode(@NotNull String code, @Nullable String filename) {
        return CompletableFuture.supplyAsync(() -> {
            NeuroLintSettings settings = NeuroLintSettings.getInstance();
            
            if (!settings.isConfigured()) {
                return new AnalysisResult(false, "API key not configured", null);
            }
            
            try {
                JsonObject requestBody = new JsonObject();
                requestBody.addProperty("code", code);
                requestBody.addProperty("filename", filename != null ? filename : "untitled.tsx");
                requestBody.addProperty("layers", gson.toJson(settings.enabledLayers));
                requestBody.addProperty("dryRun", false);
                
                if (!settings.teamId.isEmpty()) {
                    requestBody.addProperty("teamId", settings.teamId);
                }
                
                Request request = new Request.Builder()
                    .url(settings.apiEndpoint + "/api/analyze")
                    .addHeader("Authorization", "Bearer " + settings.apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(gson.toJson(requestBody), JSON))
                    .build();
                
                try (Response response = client.newCall(request).execute()) {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    
                    if (response.isSuccessful()) {
                        JsonObject result = gson.fromJson(responseBody, JsonObject.class);
                        return new AnalysisResult(true, null, result);
                    } else {
                        LOG.warn("NeuroLint API error: " + response.code() + " - " + responseBody);
                        return new AnalysisResult(false, "API error: " + response.code(), null);
                    }
                }
            } catch (IOException e) {
                LOG.error("Failed to connect to NeuroLint API", e);
                return new AnalysisResult(false, "Connection failed: " + e.getMessage(), null);
            }
        });
    }
    
    public CompletableFuture<Boolean> validateApiKey() {
        return CompletableFuture.supplyAsync(() -> {
            NeuroLintSettings settings = NeuroLintSettings.getInstance();
            
            if (!settings.isConfigured()) {
                return false;
            }
            
            try {
                Request request = new Request.Builder()
                    .url(settings.apiEndpoint + "/api/health")
                    .addHeader("Authorization", "Bearer " + settings.apiKey)
                    .get()
                    .build();
                
                try (Response response = client.newCall(request).execute()) {
                    return response.isSuccessful();
                }
            } catch (IOException e) {
                LOG.error("Failed to validate API key", e);
                return false;
            }
        });
    }
    
    public static class AnalysisResult {
        public final boolean success;
        public final String error;
        public final JsonObject data;
        
        public AnalysisResult(boolean success, String error, JsonObject data) {
            this.success = success;
            this.error = error;
            this.data = data;
        }
    }
}
