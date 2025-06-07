#!/usr/bin/env node

/**
 * Jira Stundenzettel CLI
 * Nutzt die gleiche Konfiguration wie ankitpokhrel/jira-cli
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import { Command, Option } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import yaml from 'js-yaml';
import inquirer from 'inquirer';

// Interfaces
// Interfaces wurden entfernt, da reines JavaScript verwendet wird.
// Die erwarteten Strukturen können bei Bedarf via JSDoc dokumentiert werden.

class JiraTimesheetCLI {
  config = null;
  configPath;
  apiToken = null;

  constructor() {
    // Default config path wie bei jira-cli
    this.configPath = path.join(os.homedir(), '.config', '.jira', '.config.yml');
  }

  /**
   * Convert date format from DD.MM.YYYY to YYYY-MM-DD for JIRA API compatibility
   * @param {string} dateString - Date in DD.MM.YYYY format
   * @returns {string} Date in YYYY-MM-DD format
   * @throws {Error} If date format is invalid
   */
  convertDateFormat(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Date string is required and must be a string');
    }

    // Check if already in YYYY-MM-DD format
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDatePattern.test(dateString)) {
      // Validate the date is actually valid
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateString}`);
      }
      return dateString;
    }

    // Check for DD.MM.YYYY format
    const germanDatePattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const match = dateString.match(germanDatePattern);
    
    if (!match) {
      throw new Error(`Invalid date format: ${dateString}. Expected DD.MM.YYYY or YYYY-MM-DD format.`);
    }

    const [, day, month, year] = match;
    
    // Validate day and month ranges
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (dayNum < 1 || dayNum > 31) {
      throw new Error(`Invalid day: ${day}. Day must be between 1 and 31.`);
    }
    
    if (monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
    }
    
    if (yearNum < 1900 || yearNum > 2100) {
      throw new Error(`Invalid year: ${year}. Year must be between 1900 and 2100.`);
    }

    // Pad day and month with leading zeros
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    
    const convertedDate = `${year}-${paddedMonth}-${paddedDay}`;
    
    // Final validation: check if the date is actually valid
    const date = new Date(convertedDate);
    if (isNaN(date.getTime()) || date.toISOString().split('T')[0] !== convertedDate) {
      throw new Error(`Invalid date: ${dateString}. The date does not exist.`);
    }
    
    return convertedDate;
  }

  /**
   * Determine config file path following jira-cli logic:
   * 1. --config/-c parameter (highest priority)
   * 2. JIRA_CONFIG_FILE environment variable
   * 3. Default path: ~/.config/.jira/.config.yml
   */
  getConfigPath(configOverride) {
    if (configOverride) {
      return configOverride;
    }
    
    if (process.env.JIRA_CONFIG_FILE) {
      return process.env.JIRA_CONFIG_FILE;
    }
    
    return this.configPath;
  }

  /**
   * Load jira-cli configuration
   */
  async loadConfig(configPath) {
    const configFile = this.getConfigPath(configPath);
    
    try {
      const configData = await fs.readFile(configFile, 'utf-8');
      this.config = yaml.load(configData);
      
      // Validate config structure
      if (!this.config || typeof this.config !== 'object') {
        throw new Error('Invalid configuration file: Configuration must be a valid object');
      }
      
      // Load credentials from environment variable based on auth_type
      const authType = this.config.auth_type || 'api_token';
      this.apiToken = process.env.JIRA_API_TOKEN || null;
      
      if (!this.apiToken) {
        const tokenName = authType === 'api_token' ? 'API Token' : 'Password';
        throw new Error(`JIRA_API_TOKEN environment variable not set. Please set your ${tokenName} as JIRA_API_TOKEN.`);
      }
      
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found at ${configFile}. Please run 'jira init' first.`);
      }
      throw error;
    }
  }

  /**
   * Test connection with existing config
   */
  async testConnection() {
    if (!this.config || !this.apiToken) {
      throw new Error('Configuration not loaded. Run loadConfig() first.');
    }

    try {
      const response = await this.makeRequest('/rest/api/3/myself');
      console.log(chalk.green(`✅ Connected as: ${response.displayName} (${response.emailAddress})`));
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated request to Jira API
   */
  async makeRequest(endpoint) {
    if (!this.config || !this.apiToken) {
      throw new Error('Configuration not loaded. Run loadConfig() first.');
    }

    const baseUrl = this.config.server.replace(/\/$/, '');
    const authType = this.config.auth_type || 'api_token';
    
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Set authorization header based on auth type
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    } else {
      // For 'api_token', 'basic', and other types, use Basic auth
      const auth = Buffer.from(`${this.config.login}:${this.apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Configure fetch options
    const fetchOptions = { headers };
    
    // Handle insecure flag for self-signed certificates
    if (this.config.insecure) {
      // Note: node-fetch doesn't directly support ignoring SSL errors
      // This would typically require setting NODE_TLS_REJECT_UNAUTHORIZED=0
      // or using a custom agent, but we'll document this in the config
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get project from config or parameter
   */
  getProject(options) {
    const projectKey = options.project || this.config?.project?.key || this.config?.project;
    if (!projectKey) {
      throw new Error('No project specified. Use -p/--project or set default project in config.');
    }
    return projectKey;
  }

  /**
   * Get worklogs for a project within date range
   */
  async getProjectWorklogs(options) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Run loadConfig() first.');
    }

    // Normalize user input to array for multi-user support
    const usersToFilter = options.user
      ? (Array.isArray(options.user) ? options.user : [options.user])
        .filter(user => user && typeof user === 'string' && user.trim().length > 0)
        .map(user => user.trim())
      : [];

    const project = this.getProject(options);
    console.log(chalk.blue(`🔍 Searching for issues in project: ${project}`));

    // Build JQL query
    let jql = `project = "${project}"`;
    
    if (usersToFilter.length > 0) {
      if (usersToFilter.length === 1) {
        jql += ` AND worklogAuthor = "${usersToFilter[0]}"`;
      } else {
        const userList = usersToFilter.map(user => `"${user}"`).join(', ');
        jql += ` AND worklogAuthor IN (${userList})`;
      }
    }

    // Convert date formats for JQL query
    let convertedStartDate = null;
    let convertedEndDate = null;
    
    if (options.start || options.end) {
      try {
        if (options.start) {
          convertedStartDate = this.convertDateFormat(options.start);
          jql += ` AND worklogDate >= "${convertedStartDate}"`;
        }
        if (options.end) {
          convertedEndDate = this.convertDateFormat(options.end);
          jql += ` AND worklogDate <= "${convertedEndDate}"`;
        }
      } catch (error) {
        throw new Error(`Date format error: ${error.message}`);
      }
    }

    // Search for issues
    const searchResponse = await this.makeRequest(
      `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=key,summary&maxResults=1000`
    );

    if (searchResponse.issues.length === 0) {
      console.log(chalk.yellow('⚠️  No issues found matching criteria'));
      return [];
    }

    console.log(chalk.blue(`📋 Found ${searchResponse.issues.length} issues. Getting worklogs...`));

    const worklogEntries = [];

    // Get worklogs for each issue
    for (const issue of searchResponse.issues) {
      try {
        const worklogResponse = await this.makeRequest(`/rest/api/3/issue/${issue.key}/worklog`);
        
        for (const worklog of worklogResponse.worklogs) {
          // Apply date and user filters to worklogs
          const worklogDate = worklog.started.split('T')[0];
          
          // Use converted dates for consistent comparison (YYYY-MM-DD format)
          if (convertedStartDate && worklogDate < convertedStartDate) continue;
          if (convertedEndDate && worklogDate > convertedEndDate) continue;
          if (usersToFilter.length > 0 && !usersToFilter.includes(worklog.author.emailAddress)) continue;

          // DEBUG: Log worklog.comment structure
          // if (worklog.comment) { // Nur loggen, wenn ein Kommentar vorhanden ist
          //   console.log(chalk.magenta('DEBUG: worklog.comment structure for issue ' + issue.key + ' worklog ' + worklog.id + ':'), JSON.stringify(worklog.comment, null, 2));
          // }

          worklogEntries.push({
            issueKey: issue.key,
            issueSummary: issue.fields.summary,
            author: worklog.author.displayName,
            timeSpent: worklog.timeSpent,
            timeSpentSeconds: worklog.timeSpentSeconds,
            comment: this.extractCommentText(worklog.comment),
            started: worklog.started,
            created: worklog.created
          });
        }
      } catch (error) {
        console.log(chalk.red(`❌ Error getting worklogs for ${issue.key}: ${error.message}`));
      }
    }

    return worklogEntries.sort((a, b) => new Date(a.started).getTime() - new Date(b.started).getTime());
  }

  /**
   * Extracts plain text from Jira's Atlassian Document Format comment.
   * Concatenates text from all 'text' nodes within paragraphs.
   */
  extractCommentText(commentObject) {
    if (!commentObject || !commentObject.content || !Array.isArray(commentObject.content)) {
      return '';
    }

    let fullText = '';
    try {
      commentObject.content.forEach(block => {
        if (block.type === 'paragraph' && block.content && Array.isArray(block.content)) {
          block.content.forEach(inline => {
            if (inline.type === 'text' && inline.text) {
              if (fullText.length > 0) {
                fullText += ' '; // Add space between text parts from different nodes if needed
              }
              fullText += inline.text;
            }
          });
        }
      });
    } catch (e) {
      // Bei komplexeren Strukturen oder Fehlern, leeren String zurückgeben oder loggen
      console.warn(chalk.yellow('Warning: Could not fully parse comment object. Returning raw or partial text.'), e);
      return ''; // Fallback to empty string or potentially JSON.stringify(commentObject) if preferred
    }
    return fullText;
  }

  /**
   * Format time from seconds to human readable
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  /**
   * Group worklogs by user and then by date
   */
  groupByUserAndDate(entries) {
    const grouped = new Map();
    
    entries.forEach(entry => {
      const date = new Date(entry.started).toLocaleDateString('de-DE');
      
      if (!grouped.has(entry.author)) {
        grouped.set(entry.author, new Map());
      }
      
      const userMap = grouped.get(entry.author);
      if (userMap && !userMap.has(date)) {
        userMap.set(date, []);
      }
      
      const dayEntries = userMap ? userMap.get(date) : undefined;
      if (dayEntries) {
          dayEntries.push(entry);
      }
    });
    
    return grouped;
  }

  /**
   * Display timesheet as table grouped by user and date
   */
  displayTable(entries, disableChalk = false) {
    if (entries.length === 0) {
      return disableChalk ? '📝 No worklogs found' : chalk.yellow('📝 No worklogs found');
    }

    const groupedEntries = this.groupByUserAndDate(entries);
    let grandTotalSeconds = 0;
    let totalEntries = 0;
    let output = '';

    const title = 'Stundenzettel';
    output += '📊 ' + (disableChalk ? title : chalk.bold(title));

    // Iterate through each user
    let isFirstUser = true;
    for (const [author, userDateMap] of groupedEntries) {
      // Add empty line before each user header (including the first one after title)
      const authorText = `\n\n👤 ${author}`;
      output += disableChalk ? authorText : chalk.cyan(authorText);
      isFirstUser = false;
      output += '\n' + '─'.repeat(80);

      let userTotalSeconds = 0;
      let userTotalEntries = 0;

      // Create one continuous table for all days of this user
      const table = new Table({
        head: ['Datum', 'Issue', 'Comment', 'Time'],
        colWidths: [12, 15, 40, 10],
        wordWrap: true,
        chars: disableChalk ? {
          'top': '-' , 'top-mid': '+' , 'top-left': '+' , 'top-right': '+'
        , 'bottom': '-' , 'bottom-mid': '+' , 'bottom-left': '+' , 'bottom-right': '+'
        , 'left': '|' , 'left-mid': '+' , 'mid': '-' , 'mid-mid': '+'
        , 'right': '|' , 'right-mid': '+' , 'middle': '|'
      } : undefined,
      style: disableChalk ? { 'padding-left': 1, 'padding-right': 1, head: [], border: [] } : undefined
      });

      // Sort dates
      const sortedDates = Array.from(userDateMap.keys()).sort((a, b) => {
        const dateA = new Date(a.split('.').reverse().join('-'));
        const dateB = new Date(b.split('.').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });

      // Iterate through each date for this user
      for (const date of sortedDates) {
        const dayEntries = userDateMap.get(date);
        if (!dayEntries) continue; // Skip if no entries for this date
        
        let dayTotalSeconds = 0;

        // Sort entries within the day by time
        dayEntries.sort((a, b) => new Date(a.started).getTime() - new Date(b.started).getTime());

        // Add regular worklog entries
        dayEntries.forEach((entry, index) => {
          table.push([
            index === 0 ? date : '', // Show date only in first row of each day
            entry.issueKey,
            entry.comment || '',
            entry.timeSpent
          ]);

          dayTotalSeconds += entry.timeSpentSeconds;
        });

        // Add day total row (without separator line)
        const eintreageText = `${dayEntries.length} Einträge`;
        const timeText = this.formatTime(dayTotalSeconds);

        table.push([
          { colSpan: 2, content: '' },
          disableChalk ? eintreageText : chalk.bold(eintreageText),
          disableChalk ? timeText : chalk.bold.green(timeText)
        ]);
        
        userTotalSeconds += dayTotalSeconds;
        userTotalEntries += dayEntries.length;
      }

      output += '\n' + table.toString();
      
      // User summary
      const userSummaryText = `\n\n📈 ${author} Gesamt: ${this.formatTime(userTotalSeconds)} (${userTotalEntries} Einträge)`;
      output += disableChalk ? userSummaryText : chalk.bold.blue(userSummaryText);
      
      grandTotalSeconds += userTotalSeconds;
      totalEntries += userTotalEntries;
    }

    // Grand total
    output += '\n\n' + '='.repeat(80);
    const gesamtzeitText = `🏆 Gesamtzeit aller Benutzer: ${this.formatTime(grandTotalSeconds)} (${totalEntries} Einträge)`;
    const anzahlBenutzerText = `📊 Anzahl Benutzer: ${groupedEntries.size}`;
    output += '\n' + (disableChalk ? gesamtzeitText : chalk.bold.green(gesamtzeitText));
    output += '\n' + (disableChalk ? anzahlBenutzerText : chalk.gray(anzahlBenutzerText));

    return output;
  }

  /**
   * Export timesheet as CSV (grouped by user and date)
   */
  exportToCsv(entries) {
    const headers = ['Date', 'User', 'Issue Key', 'Comment', 'Time Spent', 'Time (Seconds)', 'Started', 'Created'];
    const rows = [headers.join(',')];

    const groupedEntries = this.groupByUserAndDate(entries);

    // Add data rows grouped by user and date
    for (const [author, userDateMap] of groupedEntries) {
      // Sort dates
      const sortedDates = Array.from(userDateMap.keys()).sort((a, b) => {
        const dateA = new Date(a.split('.').reverse().join('-'));
        const dateB = new Date(b.split('.').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });

      for (const date of sortedDates) {
        const dayEntries = userDateMap.get(date);
        if (!dayEntries) continue;
        
        dayEntries.sort((a, b) => new Date(a.started).getTime() - new Date(b.started).getTime());
        
        // Add regular worklog entries
        dayEntries.forEach((entry) => {
          const row = [
            date, // Always show date in first column
            author,
            entry.issueKey,
            `"${(entry.comment || '').replace(/"/g, '""')}"`,
            entry.timeSpent,
            entry.timeSpentSeconds.toString(),
            entry.started,
            entry.created
          ];
          rows.push(row.join(','));
        });

        // Add day total row
        const dayTotalSeconds = dayEntries.reduce((sum, entry) => sum + entry.timeSpentSeconds, 0);
        const dayTotalRow = [
          date,
          author,
          '📊 TAGESSUMME',
          `"${dayEntries.length} Einträge"`,
          this.formatTime(dayTotalSeconds),
          dayTotalSeconds.toString(),
          '',
          ''
        ];
        rows.push(dayTotalRow.join(','));
      }
    }

    return rows.join('\n');
  }

  /**
   * Export timesheet as Markdown (grouped by user and date)
   */
  exportToMarkdown(entries) {
    if (entries.length === 0) {
      return '# Stundenzettel\n\n📝 No worklogs found';
    }

    const groupedEntries = this.groupByUserAndDate(entries);
    let grandTotalSeconds = 0;
    let totalEntries = 0;
    let output = '';

    // Main title
    output += '# Stundenzettel\n\n';

    // Iterate through each user
    for (const [author, userDateMap] of groupedEntries) {
      output += `## 👤 ${author}\n\n`;

      let userTotalSeconds = 0;
      let userTotalEntries = 0;

      // Create one continuous markdown table for all days of this user
      output += '| Datum | Issue Key | Comment | Time Spent |\n';
      output += '|-------|-----------|---------|------------|\n';

      // Sort dates
      const sortedDates = Array.from(userDateMap.keys()).sort((a, b) => {
        const dateA = new Date(a.split('.').reverse().join('-'));
        const dateB = new Date(b.split('.').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });

      // Iterate through each date for this user
      for (const date of sortedDates) {
        const dayEntries = userDateMap.get(date);
        if (!dayEntries) continue;
        
        let dayTotalSeconds = 0;

        // Sort entries within the day by time
        dayEntries.sort((a, b) => new Date(a.started).getTime() - new Date(b.started).getTime());

        // Add regular worklog entries
        dayEntries.forEach((entry, index) => {
          // Escape pipe characters and newlines in markdown table content
          const escapedComment = (entry.comment || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
          
          output += `| ${index === 0 ? date : ''} | ${entry.issueKey} | ${escapedComment} | ${entry.timeSpent} |\n`;
          dayTotalSeconds += entry.timeSpentSeconds;
        });

        // Add day total row
        output += `| | | **${dayEntries.length} Einträge** | **${this.formatTime(dayTotalSeconds)}** |\n`;
        
        userTotalSeconds += dayTotalSeconds;
        userTotalEntries += dayEntries.length;
      }
      
      output += '\n';
      
      // User summary
      output += `**📈 ${author} Gesamt: ${this.formatTime(userTotalSeconds)} (${userTotalEntries} Einträge)**\n\n`;
      output += '---\n\n';
      
      grandTotalSeconds += userTotalSeconds;
      totalEntries += userTotalEntries;
    }

    // Grand total
    output += '## 🏆 Gesamtübersicht\n\n';
    output += `**Gesamtzeit aller Benutzer:** ${this.formatTime(grandTotalSeconds)} (${totalEntries} Einträge)  \n`;
    output += `**Anzahl Benutzer:** ${groupedEntries.size}\n`;

    return output;
  }

  /**
   * Generate timesheet
   */
  async generateTimesheet(options) {
    const project = this.getProject(options);
    // Die Konsolenausgaben hier bleiben farbig, da sie direkt an den Benutzer gehen
    console.log(chalk.blue(`📈 Generating timesheet for project: ${project}`));
    
    const entries = await this.getProjectWorklogs(options);

    // Normalize format to lowercase for case-insensitive comparison
    const normalizedFormat = options.format ? options.format.toLowerCase() : 'table';

    if (normalizedFormat === 'json') {
      const output = JSON.stringify(entries, null, 2);
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`✅ JSON exported to: ${options.output}`));
      } else {
        console.log(output);
      }
    } else if (normalizedFormat === 'csv') {
      const csv = this.exportToCsv(entries);
      if (options.output) {
        await fs.writeFile(options.output, csv);
        console.log(chalk.green(`✅ CSV exported to: ${options.output}`));
      } else {
        console.log(csv);
      }
    } else if (normalizedFormat === 'markdown') {
      const markdown = this.exportToMarkdown(entries);
      if (options.output) {
        await fs.writeFile(options.output, markdown);
        console.log(chalk.green(`✅ Markdown exported to: ${options.output}`));
      } else {
        console.log(markdown);
      }
    } else {
      // Wenn in eine Datei geschrieben wird (options.output ist true), deaktiviere Chalk
      const disableChalkForFileOutput = !!options.output;
      const tableOutput = this.displayTable(entries, disableChalkForFileOutput);
      
      if (options.output) {
        await fs.writeFile(options.output, tableOutput);
        console.log(chalk.green(`✅ Table exported to: ${options.output}`));
      } else {
        console.log(tableOutput);
      }
    }
  }

  /**
   * Show current configuration
   */
  async showConfig() {
    if (!this.config) {
      console.log(chalk.yellow('⚠️  No configuration loaded.'));
      return;
    }

    console.log(chalk.blue('📋 Current jira-cli Configuration:'));
    console.log(`Server: ${this.config.server}`);
    console.log(`Login: ${this.config.login}`);
    console.log(`Project: ${this.config.project?.key || this.config.project || 'Not set'}`);
    if (this.config.project?.board_id) {
      console.log(`Board ID: ${this.config.project.board_id}`);
    }
    console.log(`Installation: ${this.config.installation}`);
    console.log(`Auth Type: ${this.config.auth_type}`);
    console.log(`Insecure: ${this.config.insecure ? 'Yes (TLS verification disabled)' : 'No'}`);
    
    console.log(`Credentials: ${this.apiToken ? 'Set via JIRA_API_TOKEN' : 'Not set'}`);
    
    if (this.config.timesheet) {
      console.log(`Default Format: ${this.config.timesheet.default_format || 'table'}`);
      console.log(`Group by User: ${this.config.timesheet.group_by_user || false}`);
    }
    
    const configSource = process.env.JIRA_CONFIG_FILE
      ? `JIRA_CONFIG_FILE env var: ${process.env.JIRA_CONFIG_FILE}`
      : `Default: ${this.configPath}`;
    console.log(`Config Path: ${configSource}`);
  }

  /**
   * Validate Jira server URL
   */
  validateServerUrl(url) {
    if (!url || typeof url !== 'string') {
      return 'Server URL is required';
    }
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return 'Server URL cannot be empty';
    }
    
    try {
      const urlObj = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'Server URL must use HTTP or HTTPS protocol';
      }
      return true;
    } catch (error) {
      return 'Invalid URL format';
    }
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return 'Email is required';
    }
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'Email cannot be empty';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Invalid email format';
    }
    
    return true;
  }

  /**
   * Validate project key
   */
  validateProjectKey(projectKey) {
    if (!projectKey) {
      return true; // Optional field
    }
    
    if (typeof projectKey !== 'string') {
      return 'Project key must be a string';
    }
    
    const trimmedKey = projectKey.trim();
    if (trimmedKey && !/^[A-Z][A-Z0-9]*$/.test(trimmedKey)) {
      return 'Project key must start with a letter and contain only uppercase letters and numbers';
    }
    
    return true;
  }

  /**
   * Validate board name
   */
  validateBoardName(boardName) {
    if (!boardName) {
      return true; // Optional field
    }
    
    if (typeof boardName !== 'string') {
      return 'Board name must be a string';
    }
    
    const trimmedName = boardName.trim();
    if (trimmedName.length === 0) {
      return 'Board name cannot be empty';
    }
    
    return true;
  }

  /**
   * Create backup of existing configuration
   */
  async createConfigBackup(configPath) {
    try {
      await fs.access(configPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${configPath}.backup-${timestamp}`;
      await fs.copyFile(configPath, backupPath);
      console.log(chalk.yellow(`📦 Existing configuration backed up to: ${backupPath}`));
      return backupPath;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, no backup needed
      return null;
    }
  }

  /**
   * Early credential validation - sofortiger Abbruch bei API-Fehlern wie im Original
   */
  async validateCredentialsEarly(config, apiToken) {
    if (!apiToken) {
      console.error(chalk.red(`Received unexpected response '401 Unauthorized' from jira.`));
      process.exit(1);
    }

    const baseUrl = config.server.replace(/\/$/, '');
    const authType = config.authType || 'api_token';
    
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Set authorization header based on auth type
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiToken}`;
    } else {
      // For 'api_token', 'basic', and other types, use Basic auth
      const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Configure fetch options
    const fetchOptions = { headers };
    
    // Handle insecure flag for self-signed certificates
    if (config.insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/2/myself`, fetchOptions);

      if (!response.ok) {
        console.error(chalk.red(`Received unexpected response '${response.status} ${response.statusText}' from jira.`));
        process.exit(1);
      }

      const userData = await response.json();
      console.log(chalk.green(`✅ Credentials validated! Connected as: ${userData.displayName} (${userData.emailAddress})`));
      return userData;
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(chalk.red(`Received unexpected response '404 Not Found' from jira.`));
      } else {
        console.error(chalk.red(`Received unexpected response '401 Unauthorized' from jira.`));
      }
      process.exit(1);
    }
  }

  /**
   * Get user info for Bearer auth to auto-detect login
   */
  async getUserInfoForBearerAuth(config, apiToken) {
    const baseUrl = config.server.replace(/\/$/, '');
    
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    };
    
    const fetchOptions = { headers };
    
    if (config.insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/2/myself`, fetchOptions);

      if (!response.ok) {
        console.error(chalk.red(`Received unexpected response '${response.status} ${response.statusText}' from jira.`));
        process.exit(1);
      }

      return await response.json();
    } catch (error) {
      console.error(chalk.red(`Received unexpected response '401 Unauthorized' from jira.`));
      process.exit(1);
    }
  }

  /**
   * Test connection with provided configuration
   */
  async testConnectionWithConfig(config, apiToken) {
    try {
      const baseUrl = config.server.replace(/\/$/, '');
      const authType = config.auth_type || 'api_token';
      
      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Set authorization header based on auth type
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiToken}`;
      } else {
        // For 'api_token', 'basic', and other types, use Basic auth
        const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      // Configure fetch options
      const fetchOptions = { headers };
      
      // Handle insecure flag for self-signed certificates
      if (config.insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      
      const response = await fetch(`${baseUrl}/rest/api/3/myself`, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const userData = await response.json();
      console.log(chalk.green(`✅ Connection successful! Connected as: ${userData.displayName} (${userData.emailAddress})`));
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Connection failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Load available projects from Jira API - sofortiger Abbruch bei Fehlern
   */
  async loadAvailableProjects(config, apiToken) {
    const baseUrl = config.server.replace(/\/$/, '');
    const authType = config.authType || 'api_token';
    
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Set authorization header based on auth type
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiToken}`;
    } else {
      // For 'api_token', 'basic', and other types, use Basic auth
      const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Configure fetch options
    const fetchOptions = { headers };
    
    // Handle insecure flag for self-signed certificates
    if (config.insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/3/project`, fetchOptions);

      if (!response.ok) {
        console.error(chalk.red(`Received unexpected response '${response.status} ${response.statusText}' from jira.`));
        process.exit(1);
      }

      const projects = await response.json();
      return projects.map(project => ({
        key: project.key,
        name: project.name,
        id: project.id,
        type: project.projectTypeKey === 'software' ? 'software' : 'classic'
      }));
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(chalk.red(`Received unexpected response '404 Not Found' from jira.`));
      } else {
        console.error(chalk.red(`Received unexpected response '403 Forbidden' from jira.`));
      }
      process.exit(1);
    }
  }

  /**
   * Load user timezone from Jira API - sofortiger Abbruch bei Fehlern
   */
  async loadUserTimezone(config, apiToken) {
    const baseUrl = config.server.replace(/\/$/, '');
    const authType = config.authType || 'api_token';
    
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Set authorization header based on auth type
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiToken}`;
    } else {
      // For 'api_token', 'basic', and other types, use Basic auth
      const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Configure fetch options
    const fetchOptions = { headers };
    
    // Handle insecure flag for self-signed certificates
    if (config.insecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    
    try {
      const response = await fetch(`${baseUrl}/rest/api/2/myself`, fetchOptions);

      if (!response.ok) {
        console.error(chalk.red(`Received unexpected response '${response.status} ${response.statusText}' from jira.`));
        process.exit(1);
      }

      const userData = await response.json();
      return userData.timeZone || 'UTC';
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(chalk.red(`Received unexpected response '404 Not Found' from jira.`));
      } else {
        console.error(chalk.red(`Received unexpected response '401 Unauthorized' from jira.`));
      }
      process.exit(1);
    }
  }

  /**
   * Load issue types for a project from Jira API
   */
  async loadIssueTypes(config, projectKey, apiToken) {
    try {
      const baseUrl = config.server.replace(/\/$/, '');
      const authType = config.auth_type || 'api_token';
      
      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Set authorization header based on auth type
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiToken}`;
      } else {
        // For 'api_token', 'basic', and other types, use Basic auth
        const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      // Configure fetch options
      const fetchOptions = { headers };
      
      // Handle insecure flag for self-signed certificates
      if (config.insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      
      const response = await fetch(`${baseUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load issue types`);
      }

      const data = await response.json();
      const project = data.projects?.[0];
      if (!project) {
        return [];
      }

      return project.issuetypes.map(issueType => ({
        id: issueType.id,
        name: issueType.name,
        handle: issueType.name,
        subtask: issueType.subtask || false
      }));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not load issue types: ${error.message}`));
      return [];
    }
  }

  /**
   * Load all custom fields from Jira API
   */
  async loadCustomFields(config, apiToken) {
    try {
      const baseUrl = config.server.replace(/\/$/, '');
      const authType = config.auth_type || 'api_token';
      
      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Set authorization header based on auth type
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiToken}`;
      } else {
        // For 'api_token', 'basic', and other types, use Basic auth
        const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      // Configure fetch options
      const fetchOptions = { headers };
      
      // Handle insecure flag for self-signed certificates
      if (config.insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      
      const response = await fetch(`${baseUrl}/rest/api/3/field`, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load custom fields`);
      }

      const fields = await response.json();
      
      // Filter only custom fields and format them
      return fields
        .filter(field => field.custom && field.id.startsWith('customfield_'))
        .map(field => ({
          name: field.name,
          key: field.id,
          schema: {
            datatype: field.schema?.type || 'string'
          }
        }));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not load custom fields: ${error.message}`));
      return [];
    }
  }

  /**
   * Detect Epic Name and Link fields from custom fields
   */
  async detectEpicFields(customFields) {
    const epicFields = {
      name: null,
      link: null
    };

    // Common patterns for Epic Name field
    const epicNamePatterns = [
      /epic.*name/i,
      /name.*epic/i,
      /epic.*summary/i
    ];

    // Common patterns for Epic Link field
    const epicLinkPatterns = [
      /epic.*link/i,
      /link.*epic/i,
      /parent.*link/i
    ];

    for (const field of customFields) {
      // Check for Epic Name field
      if (!epicFields.name && epicNamePatterns.some(pattern => pattern.test(field.name))) {
        epicFields.name = field.key;
      }

      // Check for Epic Link field
      if (!epicFields.link && epicLinkPatterns.some(pattern => pattern.test(field.name))) {
        epicFields.link = field.key;
      }

      // Break early if both found
      if (epicFields.name && epicFields.link) {
        break;
      }
    }

    return epicFields;
  }

  /**
   * Load available boards for a project from Jira API
   */
  async loadAvailableBoards(config, projectKey, apiToken) {
    try {
      const baseUrl = config.server.replace(/\/$/, '');
      const authType = config.auth_type || 'api_token';
      
      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Set authorization header based on auth type
      if (authType === 'bearer') {
        headers['Authorization'] = `Bearer ${apiToken}`;
      } else {
        // For 'api_token', 'basic', and other types, use Basic auth
        const auth = Buffer.from(`${config.login}:${apiToken}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      
      // Configure fetch options
      const fetchOptions = { headers };
      
      // Handle insecure flag for self-signed certificates
      if (config.insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      
      const response = await fetch(`${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load boards`);
      }

      const data = await response.json();
      return data.values.map(board => ({
        id: board.id,
        name: board.name,
        type: board.type.toLowerCase() // Normalize to lowercase (scrum/kanban)
      }));
    } catch (error) {
      throw new Error(`Failed to load boards: ${error.message}`);
    }
  }

  /**
   * Interactive configuration setup with support for non-interactive parameters
   */
  async initializeConfiguration(options = {}) {
    console.log(chalk.blue.bold('🚀 Jira Timesheet CLI Configuration Setup'));
    console.log(chalk.gray('This will create a configuration compatible with ankitpokhrel/jira-cli\n'));
    this.apiToken = process.env.JIRA_API_TOKEN || null; // Initialize apiToken

    const configPath = this.getConfigPath(options.config);
    
    // STEP 1: Check if config exists and ask for confirmation to overwrite (FIRST PRIORITY)
    try {
      await fs.access(configPath);
      if (!options.force) {
        const overwriteAnswer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Configuration file already exists. Do you want to overwrite it?',
            default: false
          }
        ]);
        
        if (!overwriteAnswer.overwrite) {
          console.log(chalk.yellow('⚠️  Configuration cancelled.'));
          return;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, continue with setup
    }

    // Validate provided parameters
    if (options.installation && !['cloud', 'local'].includes(options.installation)) {
      throw new Error('Invalid installation type. Must be "cloud" or "local".');
    }
    
    if (options.authType && !['basic', 'bearer', 'mtls', 'api_token'].includes(options.authType)) {
      throw new Error('Invalid auth type. Must be "basic", "bearer", "mtls", or "api_token".');
    }
    
    if (options.server) {
      const serverValidation = this.validateServerUrl(options.server);
      if (serverValidation !== true) {
        throw new Error(`Invalid server URL: ${serverValidation}`);
      }
    }
    
    if (options.login) {
      // Validate based on installation type if provided, otherwise assume cloud for email validation
      const isCloud = options.installation === 'cloud' || (!options.installation && options.login.includes('@'));
      const loginValidation = isCloud ? this.validateEmail(options.login) :
        (options.login.trim() ? true : 'Username cannot be empty');
      if (loginValidation !== true) {
        throw new Error(`Invalid login: ${loginValidation}`);
      }
    }
    
    if (options.project) {
      const projectValidation = this.validateProjectKey(options.project);
      if (projectValidation !== true) {
        throw new Error(`Invalid project key: ${projectValidation}`);
      }
    }
    
    if (options.board) {
      const boardValidation = this.validateBoardName(options.board);
      if (boardValidation !== true) {
        throw new Error(`Invalid board name: ${boardValidation}`);
      }
    }
    
    // Create backup if config exists (unless --force is used)
    if (!options.force) {
      await this.createConfigBackup(configPath);
    }

    // Step 1: Installation type (use provided value or prompt)
    let installationAnswer;
    if (options.installation) {
      installationAnswer = { installation: options.installation };
    } else {
      installationAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'installation',
          message: 'Installation type:',
          choices: [
            { name: 'Cloud', value: 'cloud' },
            { name: 'Local', value: 'local' }
          ],
          default: 'cloud'
        }
      ]);
    }

    // Step 2: Authentication type (use provided value or prompt based on installation type)
    let authAnswer;
    if (options.authType) {
      authAnswer = { authType: options.authType };
    } else {
      const authChoices = installationAnswer.installation === 'cloud'
        ? [{ name: 'API Token', value: 'api_token' }]
        : [
            { name: 'Basic', value: 'basic' },
            { name: 'Bearer', value: 'bearer' },
            { name: 'MTLS', value: 'mtls' }
          ];

      authAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'authType',
          message: 'Authentication type:',
          choices: authChoices,
          default: authChoices[0].value
        }
      ]);
    }

    // Step 3: Server URL (use provided value or prompt)
    let serverAnswer;
    if (options.server) {
      serverAnswer = { server: options.server.trim().replace(/\/$/, '') };
    } else {
      serverAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'server',
          message: 'Jira server URL:',
          validate: this.validateServerUrl,
          filter: (input) => input.trim().replace(/\/$/, '') // Remove trailing slash
        }
      ]);
    }

    // Step 4: Login (use provided value or prompt - Email for Cloud, Username for Local)
    let loginAnswer;
    if (options.login) {
      loginAnswer = { login: options.login.trim() };
    } else {
      const loginMessage = installationAnswer.installation === 'cloud'
        ? 'Email:'
        : 'Username:';
      
      const loginValidator = installationAnswer.installation === 'cloud'
        ? this.validateEmail
        : (input) => {
            if (!input || typeof input !== 'string') {
              return 'Username is required';
            }
            const trimmed = input.trim();
            if (!trimmed) {
              return 'Username cannot be empty';
            }
            return true;
          };

      loginAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'login',
          message: loginMessage,
          validate: loginValidator,
          filter: (input) => input.trim()
        }
      ]);
    }

    // Combine all basic answers
    const answers = {
      ...installationAnswer,
      ...authAnswer,
      ...serverAnswer,
      ...loginAnswer
    };

    // CRITICAL: Early credential validation - sofortiger Abbruch bei API-Fehlern
    console.log(chalk.blue('\n🔍 Validating credentials...'));
    await this.validateCredentialsEarly(answers, this.apiToken);

    // For Bearer auth, get login from API if not provided
    if (authAnswer.authType === 'bearer' && !options.login) {
      const userInfo = await this.getUserInfoForBearerAuth(answers, this.apiToken);
      answers.login = userInfo.emailAddress || userInfo.name;
      console.log(chalk.green(`✅ Auto-detected login: ${answers.login}`));
    }

    // Step 6: Load user timezone
    console.log(chalk.blue('\n🔍 Loading user timezone...'));
    const timezone = await this.loadUserTimezone(answers, this.apiToken);
    console.log(chalk.green(`✅ Timezone: ${timezone}`));

    // Step 7: Project selection (use provided value or dynamic loading)
    let projectAnswer;
    let selectedProject = null;
    if (options.project) {
      projectAnswer = { projectKey: options.project };
      // Validate project immediately
      const projects = await this.loadAvailableProjects(answers, this.apiToken);
      selectedProject = projects.find(p => p.key === options.project);
      if (!selectedProject) {
        console.error(chalk.red(`Received unexpected response '403 Forbidden' from jira.`));
        process.exit(1);
      }
    } else {
      console.log(chalk.blue('\n🔍 Loading available projects...'));
      
      let projectChoices = [];
      let projects = [];
      projects = await this.loadAvailableProjects(answers, this.apiToken);
      projectChoices = projects.map(project => ({
        name: `${project.key} - ${project.name} (${project.type})`,
        value: project.key
      }));
      
      if (projectChoices.length === 0) {
        console.log(chalk.yellow('⚠️  No projects found or accessible.'));
        projectChoices = [{ name: 'Skip project selection', value: null }];
      }

      projectAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectKey',
          message: 'Select default project:',
          choices: projectChoices,
          pageSize: 10
        }
      ]);

      // Find selected project details
      if (projectAnswer.projectKey) {
        selectedProject = projects.find(p => p.key === projectAnswer.projectKey);
      }
    }

    // Step 8: Board selection (use provided value or dynamic loading)
    let boardAnswer = { boardId: null };
    let selectedBoard = null;
    if (options.board && projectAnswer.projectKey) {
      // Find board by name if provided
      try {
        const boards = await this.loadAvailableBoards(answers, projectAnswer.projectKey, this.apiToken);
        const foundBoard = boards.find(board => board.name === options.board);
        if (foundBoard) {
          boardAnswer = { boardId: foundBoard.id };
          selectedBoard = foundBoard;
        } else {
          console.log(chalk.yellow(`⚠️  Board "${options.board}" not found. Skipping board selection.`));
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not load boards: ${error.message}`));
      }
    } else if (projectAnswer.projectKey && !options.board) {
      console.log(chalk.blue('\n🔍 Loading available boards...'));
      
      try {
        const boards = await this.loadAvailableBoards(answers, projectAnswer.projectKey, this.apiToken);
        if (boards.length > 0) {
          const boardChoices = [
            { name: 'None (skip board selection)', value: null },
            ...boards.map(board => ({
              name: `${board.name} (${board.type})`,
              value: board.id
            }))
          ];

          boardAnswer = await inquirer.prompt([
            {
              type: 'list',
              name: 'boardId',
              message: 'Select default board (optional):',
              choices: boardChoices,
              pageSize: 10
            }
          ]);

          // Find selected board details
          if (boardAnswer.boardId) {
            selectedBoard = boards.find(b => b.id === boardAnswer.boardId);
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not load boards: ${error.message}`));
      }
    }

    // Step 9: Load additional API metadata if project is selected
    let issueTypes = [];
    let customFields = [];
    let epicFields = { name: null, link: null };

    if (projectAnswer.projectKey) {
      console.log(chalk.blue('\n🔍 Loading issue types...'));
      issueTypes = await this.loadIssueTypes(answers, projectAnswer.projectKey, this.apiToken);
      console.log(chalk.green(`✅ Loaded ${issueTypes.length} issue types`));

      console.log(chalk.blue('\n🔍 Loading custom fields...'));
      customFields = await this.loadCustomFields(answers, this.apiToken);
      console.log(chalk.green(`✅ Loaded ${customFields.length} custom fields`));

      console.log(chalk.blue('\n🔍 Detecting epic fields...'));
      epicFields = await this.detectEpicFields(customFields);
      if (epicFields.name || epicFields.link) {
        console.log(chalk.green(`✅ Epic fields detected: name=${epicFields.name || 'none'}, link=${epicFields.link || 'none'}`));
      } else {
        console.log(chalk.yellow('⚠️  No epic fields detected'));
      }
    }

    // Combine project and board answers
    Object.assign(answers, projectAnswer, boardAnswer);

    // Step 8: Timesheet-specific options (skip if non-interactive)
    let timesheetAnswers;
    if (options.installation || options.server || options.login) {
      // Non-interactive mode - use defaults
      timesheetAnswers = {
        enableTimesheetFeatures: true,
        defaultFormat: 'table',
        groupByUser: true
      };
    } else {
      // Interactive mode
      timesheetAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableTimesheetFeatures',
          message: 'Enable timesheet-specific features?',
          default: true
        },
        {
          type: 'list',
          name: 'defaultFormat',
          message: 'Default output format:',
          choices: ['table', 'csv', 'json', 'markdown'],
          default: 'table',
          when: (answers) => answers.enableTimesheetFeatures
        },
        {
          type: 'confirm',
          name: 'groupByUser',
          message: 'Group worklogs by user by default?',
          default: true,
          when: (answers) => answers.enableTimesheetFeatures
        }
      ]);
    }

    // Build configuration object with complete structure like original jira-cli
    const config = {
      auth_type: answers.authType,
      installation: answers.installation,
      server: answers.server,
      login: answers.login,
      timezone: timezone
    };

    // Add insecure flag if specified
    if (options.insecure) {
      config.insecure = true;
    }

    // Add project configuration with full metadata
    if (answers.projectKey && selectedProject) {
      config.project = {
        key: answers.projectKey,
        type: selectedProject.type
      };
    }

    // Add board configuration with full metadata
    if (answers.boardId && selectedBoard) {
      config.board = {
        id: answers.boardId,
        name: selectedBoard.name,
        type: selectedBoard.type
      };
    }

    // Add epic fields configuration
    if (epicFields.name || epicFields.link) {
      config.epic = {};
      if (epicFields.name) {
        config.epic.name = epicFields.name;
      }
      if (epicFields.link) {
        config.epic.link = epicFields.link;
      }
    }

    // Add issue configuration with types and custom fields
    if (issueTypes.length > 0 || customFields.length > 0) {
      config.issue = {};
      
      if (issueTypes.length > 0) {
        config.issue.types = issueTypes;
      }
      
      if (customFields.length > 0) {
        config.issue.fields = {
          custom: customFields
        };
      }
    }

    // Add timesheet-specific configuration
    if (timesheetAnswers.enableTimesheetFeatures) {
      config.timesheet = {
        default_format: timesheetAnswers.defaultFormat,
        group_by_user: timesheetAnswers.groupByUser
      };
    }

    // Alle API-Aufrufe waren erfolgreich - jetzt Konfiguration speichern
    // Ensure config directory exists
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });

    // Write configuration
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    await fs.writeFile(configPath, yamlContent, 'utf-8');

    console.log(chalk.green(`\n✅ Configuration saved to: ${configPath}`));
    
    // Show next steps
    console.log(chalk.blue('\n📋 Next Steps:'));
    console.log(chalk.gray('1. Set your credentials as environment variable:'));
    console.log(chalk.white(`   export JIRA_API_TOKEN="your-api-token"`));
    console.log(chalk.gray('2. Test the connection:'));
    console.log(chalk.white(`   timesheet test`));
    console.log(chalk.gray('3. Generate your first timesheet:'));
    console.log(chalk.white(`   timesheet generate${answers.projectKey ? ` -p ${answers.projectKey}` : ''}`));

    if (answers.installation === 'cloud' && answers.authType === 'api_token') {
      console.log(chalk.yellow('\n💡 Tip: For Atlassian Cloud, create an API token at:'));
      console.log(chalk.white('   https://id.atlassian.com/manage-profile/security/api-tokens'));
    }

    if (config.insecure) {
      console.log(chalk.yellow('\n⚠️  Warning: TLS certificate verification is disabled (--insecure flag).'));
      console.log(chalk.gray('   This should only be used in development environments.'));
    }
  }
}

// CLI Setup
const program = new Command();
const cli = new JiraTimesheetCLI();

program
  .name('jira-timesheet')
  .description('Generate timesheets from Jira worklogs using jira-cli configuration')
  .version('1.0.0');

program
  .option('-c, --config <file>', 'Config file (default: ~/.config/.jira/.config.yml)');

/**
 * Helper function to load configuration for commands that need it
 */
async function loadConfigForCommand(command) {
  const globalOptions = program.opts();
  const commandOptions = command.opts();
  
  const configFile = commandOptions.config || globalOptions.config;
  
  try {
    await cli.loadConfig(configFile);
  } catch (error) {
    console.error(chalk.red(`❌ ${error.message}`));
    process.exit(1);
  }
}

program
  .command('generate')
  .alias('gen')
  .description('Generate timesheet for a project')
  .option('-p, --project <projectKey>', 'Jira project key (e.g., SB)')
  .option('-s, --start <date>', 'Start date for worklogs (DD.MM.YYYY or YYYY-MM-DD)')
  .option('-e, --end <date>', 'End date for worklogs (DD.MM.YYYY or YYYY-MM-DD)')
  .option('-u, --user <email...>', 'Filter by user email (can be specified multiple times)')
  .addOption(new Option('-f, --format <format>', 'Output format').choices(['table', 'json', 'csv', 'markdown']).default('table'))
  .option('-o, --output <file>', 'Output file path')
  .action(async (options, command) => {
    try {
      await loadConfigForCommand(command);
      await cli.generateTimesheet(options);
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current jira-cli configuration')
  .action(async (options, command) => {
    try {
      await loadConfigForCommand(command);
      await cli.showConfig();
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize Jira configuration interactively')
  .option('-c, --config <file>', 'Config file path (default: ~/.config/.jira/.config.yml)')
  .option('--installation <type>', 'Installation type (cloud, local)')
  .option('--server <url>', 'Jira server URL')
  .option('--login <username>', 'Login username or email')
  .option('--auth-type <type>', 'Authentication type (basic, bearer, mtls, api_token)')
  .option('--project <key>', 'Default project key')
  .option('--board <name>', 'Default board name')
  .option('--force', 'Overwrite existing configuration without confirmation')
  .option('--insecure', 'Skip TLS certificate verification')
  .action(async (commandOptions) => {
    const globalOptions = program.opts();
    const effectiveConfigPath = commandOptions.config || globalOptions.config;
    await cli.initializeConfiguration({
      config: effectiveConfigPath,
      ...commandOptions
    });
  });

program
  .command('test')
  .description('Test connection to Jira')
  .action(async (options, command) => {
    try {
      await loadConfigForCommand(command);
      await cli.testConnection();
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

// Export for testing
export { JiraTimesheetCLI };

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}