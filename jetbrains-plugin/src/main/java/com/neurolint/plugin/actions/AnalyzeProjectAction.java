package com.neurolint.plugin.actions;

import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VfsUtilCore;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.vfs.VirtualFileVisitor;
import com.neurolint.plugin.services.NeuroLintService;
import com.neurolint.plugin.settings.NeuroLintSettings;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class AnalyzeProjectAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }
        
        NeuroLintSettings settings = NeuroLintSettings.getInstance();
        if (!settings.isConfigured()) {
            NotificationGroupManager.getInstance()
                .getNotificationGroup("NeuroLint Notifications")
                .createNotification(
                    "NeuroLint",
                    "Please configure your API key in Settings > Tools > NeuroLint",
                    NotificationType.WARNING
                )
                .notify(project);
            return;
        }
        
        VirtualFile baseDir = project.getBaseDir();
        if (baseDir == null) {
            return;
        }
        
        ProgressManager.getInstance().run(new Task.Backgroundable(project, "Analyzing Project with NeuroLint...", true) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                indicator.setIndeterminate(false);
                
                List<VirtualFile> files = collectSupportedFiles(baseDir);
                int total = files.size();
                int analyzed = 0;
                int issues = 0;
                
                NeuroLintService service = NeuroLintService.getInstance();
                
                for (VirtualFile file : files) {
                    if (indicator.isCanceled()) {
                        break;
                    }
                    
                    indicator.setFraction((double) analyzed / total);
                    indicator.setText("Analyzing: " + file.getName());
                    
                    try {
                        String code = new String(file.contentsToByteArray(), StandardCharsets.UTF_8);
                        NeuroLintService.AnalysisResult result = service.analyzeCode(code, file.getName()).join();
                        
                        if (result.success && result.data != null) {
                            if (result.data.has("analysis") && 
                                result.data.getAsJsonObject("analysis").has("detectedIssues")) {
                                issues += result.data.getAsJsonObject("analysis")
                                    .getAsJsonArray("detectedIssues").size();
                            }
                        }
                    } catch (IOException ex) {
                        // Skip files that can't be read
                    }
                    
                    analyzed++;
                }
                
                final int finalAnalyzed = analyzed;
                final int finalIssues = issues;
                
                NotificationGroupManager.getInstance()
                    .getNotificationGroup("NeuroLint Notifications")
                    .createNotification(
                        "NeuroLint Project Analysis Complete",
                        String.format("Analyzed %d files. Found %d issues.", finalAnalyzed, finalIssues),
                        NotificationType.INFORMATION
                    )
                    .notify(project);
            }
        });
    }
    
    private List<VirtualFile> collectSupportedFiles(VirtualFile baseDir) {
        List<VirtualFile> files = new ArrayList<>();
        
        VfsUtilCore.visitChildrenRecursively(baseDir, new VirtualFileVisitor<Void>() {
            @Override
            public boolean visitFile(@NotNull VirtualFile file) {
                if (file.isDirectory()) {
                    String name = file.getName();
                    return !name.equals("node_modules") && 
                           !name.equals(".git") && 
                           !name.equals("dist") &&
                           !name.equals("build");
                }
                
                if (isSupportedFile(file)) {
                    files.add(file);
                }
                return true;
            }
        });
        
        return files;
    }
    
    private boolean isSupportedFile(VirtualFile file) {
        String extension = file.getExtension();
        if (extension == null) return false;
        
        return extension.equals("ts") ||
               extension.equals("tsx") ||
               extension.equals("js") ||
               extension.equals("jsx");
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        e.getPresentation().setEnabledAndVisible(project != null);
    }
}
