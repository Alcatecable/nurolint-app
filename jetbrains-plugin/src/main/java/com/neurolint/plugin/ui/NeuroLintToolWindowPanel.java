package com.neurolint.plugin.ui;

import com.intellij.openapi.project.Project;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.util.ui.JBUI;

import javax.swing.*;
import java.awt.*;

public class NeuroLintToolWindowPanel extends JPanel {
    
    private final Project project;
    private final JTextArea resultsArea;
    private final JBLabel statusLabel;
    
    public NeuroLintToolWindowPanel(Project project) {
        this.project = project;
        setLayout(new BorderLayout());
        setBorder(JBUI.Borders.empty(10));
        
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBorder(JBUI.Borders.emptyBottom(10));
        
        JBLabel titleLabel = new JBLabel("NeuroLint Analysis Results");
        titleLabel.setFont(titleLabel.getFont().deriveFont(Font.BOLD, 14f));
        headerPanel.add(titleLabel, BorderLayout.WEST);
        
        statusLabel = new JBLabel("Ready");
        statusLabel.setForeground(new Color(128, 128, 128));
        headerPanel.add(statusLabel, BorderLayout.EAST);
        
        add(headerPanel, BorderLayout.NORTH);
        
        resultsArea = new JTextArea();
        resultsArea.setEditable(false);
        resultsArea.setLineWrap(true);
        resultsArea.setWrapStyleWord(true);
        resultsArea.setText("Run an analysis to see results here.\n\n" +
            "Quick Start:\n" +
            "1. Configure your API key in Settings > Tools > NeuroLint\n" +
            "2. Open a TypeScript or JavaScript file\n" +
            "3. Use Ctrl+Alt+N or Tools > NeuroLint > Analyze Current File\n\n" +
            "Supported file types:\n" +
            "  - TypeScript (.ts, .tsx)\n" +
            "  - JavaScript (.js, .jsx)");
        
        JBScrollPane scrollPane = new JBScrollPane(resultsArea);
        add(scrollPane, BorderLayout.CENTER);
        
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        buttonPanel.setBorder(JBUI.Borders.emptyTop(10));
        
        JButton analyzeButton = new JButton("Analyze Current File");
        analyzeButton.addActionListener(e -> analyzeCurrentFile());
        buttonPanel.add(analyzeButton);
        
        JButton clearButton = new JButton("Clear Results");
        clearButton.addActionListener(e -> clearResults());
        buttonPanel.add(clearButton);
        
        add(buttonPanel, BorderLayout.SOUTH);
    }
    
    private void analyzeCurrentFile() {
        statusLabel.setText("Analyzing...");
        resultsArea.setText("Running NeuroLint analysis...\n\nPlease wait.");
    }
    
    private void clearResults() {
        resultsArea.setText("");
        statusLabel.setText("Ready");
    }
    
    public void setResults(String results) {
        resultsArea.setText(results);
        statusLabel.setText("Complete");
    }
    
    public void setStatus(String status) {
        statusLabel.setText(status);
    }
}
