package com.neurolint.plugin.settings;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import com.intellij.util.xmlb.XmlSerializerUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

@State(
    name = "com.neurolint.plugin.settings.NeuroLintSettings",
    storages = @Storage("NeuroLintSettings.xml")
)
public class NeuroLintSettings implements PersistentStateComponent<NeuroLintSettings> {
    
    public String apiKey = "";
    public String apiEndpoint = "https://api.neurolint.io";
    public String teamId = "";
    public boolean autoAnalyzeOnSave = false;
    public boolean showNotifications = true;
    public boolean enableAutoFix = true;
    public int[] enabledLayers = {1, 2, 3, 4, 5, 6, 7};
    
    public static NeuroLintSettings getInstance() {
        return ApplicationManager.getApplication().getService(NeuroLintSettings.class);
    }
    
    @Nullable
    @Override
    public NeuroLintSettings getState() {
        return this;
    }
    
    @Override
    public void loadState(@NotNull NeuroLintSettings state) {
        XmlSerializerUtil.copyBean(state, this);
    }
    
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }
}
