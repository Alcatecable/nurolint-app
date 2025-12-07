package com.neurolint.plugin.actions;

import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.neurolint.plugin.services.NeuroLintService;
import com.neurolint.plugin.settings.NeuroLintSettings;
import org.jetbrains.annotations.NotNull;

public class ApplyFixesAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        
        if (project == null || editor == null) {
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
        
        if (!settings.enableAutoFix) {
            NotificationGroupManager.getInstance()
                .getNotificationGroup("NeuroLint Notifications")
                .createNotification(
                    "NeuroLint",
                    "Auto-fix is disabled. Enable it in Settings > Tools > NeuroLint",
                    NotificationType.WARNING
                )
                .notify(project);
            return;
        }
        
        Document document = editor.getDocument();
        VirtualFile file = FileDocumentManager.getInstance().getFile(document);
        String filename = file != null ? file.getName() : "untitled";
        String code = document.getText();
        
        ProgressManager.getInstance().run(new Task.Backgroundable(project, "Applying NeuroLint Fixes...", true) {
            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                indicator.setIndeterminate(true);
                
                NeuroLintService service = NeuroLintService.getInstance();
                NeuroLintService.AnalysisResult result = service.analyzeCode(code, filename).join();
                
                if (result.success && result.data != null && result.data.has("fixedCode")) {
                    String fixedCode = result.data.get("fixedCode").getAsString();
                    
                    WriteCommandAction.runWriteCommandAction(project, () -> {
                        document.setText(fixedCode);
                    });
                    
                    NotificationGroupManager.getInstance()
                        .getNotificationGroup("NeuroLint Notifications")
                        .createNotification(
                            "NeuroLint Fixes Applied",
                            "Code has been updated with NeuroLint fixes.",
                            NotificationType.INFORMATION
                        )
                        .notify(project);
                } else if (!result.success) {
                    NotificationGroupManager.getInstance()
                        .getNotificationGroup("NeuroLint Notifications")
                        .createNotification(
                            "NeuroLint Fix Failed",
                            result.error != null ? result.error : "Unable to apply fixes",
                            NotificationType.ERROR
                        )
                        .notify(project);
                } else {
                    NotificationGroupManager.getInstance()
                        .getNotificationGroup("NeuroLint Notifications")
                        .createNotification(
                            "NeuroLint",
                            "No fixes available for this file.",
                            NotificationType.INFORMATION
                        )
                        .notify(project);
                }
            }
        });
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);
        
        boolean enabled = editor != null && file != null && isSupportedFile(file);
        e.getPresentation().setEnabledAndVisible(enabled);
    }
    
    private boolean isSupportedFile(VirtualFile file) {
        String extension = file.getExtension();
        if (extension == null) return false;
        
        return extension.equals("ts") ||
               extension.equals("tsx") ||
               extension.equals("js") ||
               extension.equals("jsx");
    }
}
