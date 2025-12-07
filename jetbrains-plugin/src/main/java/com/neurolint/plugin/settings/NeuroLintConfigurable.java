package com.neurolint.plugin.settings;

import com.intellij.openapi.options.Configurable;
import com.intellij.openapi.options.ConfigurationException;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBPasswordField;
import com.intellij.ui.components.JBTextField;
import com.intellij.util.ui.FormBuilder;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;

public class NeuroLintConfigurable implements Configurable {
    
    private JBPasswordField apiKeyField;
    private JBTextField apiEndpointField;
    private JBTextField teamIdField;
    private JBCheckBox autoAnalyzeCheckBox;
    private JBCheckBox showNotificationsCheckBox;
    private JBCheckBox enableAutoFixCheckBox;
    
    @Nls(capitalization = Nls.Capitalization.Title)
    @Override
    public String getDisplayName() {
        return "NeuroLint";
    }
    
    @Nullable
    @Override
    public JComponent createComponent() {
        NeuroLintSettings settings = NeuroLintSettings.getInstance();
        
        apiKeyField = new JBPasswordField();
        apiKeyField.setText(settings.apiKey);
        apiKeyField.setColumns(40);
        
        apiEndpointField = new JBTextField(settings.apiEndpoint);
        apiEndpointField.setColumns(40);
        
        teamIdField = new JBTextField(settings.teamId);
        teamIdField.setColumns(40);
        
        autoAnalyzeCheckBox = new JBCheckBox("Auto-analyze on save", settings.autoAnalyzeOnSave);
        showNotificationsCheckBox = new JBCheckBox("Show notifications", settings.showNotifications);
        enableAutoFixCheckBox = new JBCheckBox("Enable auto-fix suggestions", settings.enableAutoFix);
        
        return FormBuilder.createFormBuilder()
            .addLabeledComponent(new JBLabel("API Key:"), apiKeyField, 1, false)
            .addLabeledComponent(new JBLabel("API Endpoint:"), apiEndpointField, 1, false)
            .addLabeledComponent(new JBLabel("Team ID (optional):"), teamIdField, 1, false)
            .addSeparator()
            .addComponent(autoAnalyzeCheckBox, 1)
            .addComponent(showNotificationsCheckBox, 1)
            .addComponent(enableAutoFixCheckBox, 1)
            .addComponentFillVertically(new JPanel(), 0)
            .getPanel();
    }
    
    @Override
    public boolean isModified() {
        NeuroLintSettings settings = NeuroLintSettings.getInstance();
        return !new String(apiKeyField.getPassword()).equals(settings.apiKey) ||
               !apiEndpointField.getText().equals(settings.apiEndpoint) ||
               !teamIdField.getText().equals(settings.teamId) ||
               autoAnalyzeCheckBox.isSelected() != settings.autoAnalyzeOnSave ||
               showNotificationsCheckBox.isSelected() != settings.showNotifications ||
               enableAutoFixCheckBox.isSelected() != settings.enableAutoFix;
    }
    
    @Override
    public void apply() throws ConfigurationException {
        NeuroLintSettings settings = NeuroLintSettings.getInstance();
        settings.apiKey = new String(apiKeyField.getPassword());
        settings.apiEndpoint = apiEndpointField.getText();
        settings.teamId = teamIdField.getText();
        settings.autoAnalyzeOnSave = autoAnalyzeCheckBox.isSelected();
        settings.showNotifications = showNotificationsCheckBox.isSelected();
        settings.enableAutoFix = enableAutoFixCheckBox.isSelected();
    }
    
    @Override
    public void reset() {
        NeuroLintSettings settings = NeuroLintSettings.getInstance();
        apiKeyField.setText(settings.apiKey);
        apiEndpointField.setText(settings.apiEndpoint);
        teamIdField.setText(settings.teamId);
        autoAnalyzeCheckBox.setSelected(settings.autoAnalyzeOnSave);
        showNotificationsCheckBox.setSelected(settings.showNotifications);
        enableAutoFixCheckBox.setSelected(settings.enableAutoFix);
    }
}
