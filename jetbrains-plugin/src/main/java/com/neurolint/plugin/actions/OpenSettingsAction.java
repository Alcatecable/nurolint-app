package com.neurolint.plugin.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.options.ShowSettingsUtil;
import com.intellij.openapi.project.Project;
import com.neurolint.plugin.settings.NeuroLintConfigurable;
import org.jetbrains.annotations.NotNull;

public class OpenSettingsAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        ShowSettingsUtil.getInstance().showSettingsDialog(project, NeuroLintConfigurable.class);
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabledAndVisible(true);
    }
}
