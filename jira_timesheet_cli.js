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
      
      // API Token aus Environment Variable laden
      this.apiToken = process.env.JIRA_API_TOKEN || null;
      
      if (!this.apiToken) {
        throw new Error('JIRA_API_TOKEN environment variable not set');
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
    const auth = Buffer.from(`${this.config.login}:${this.apiToken}`).toString('base64');
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

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
    console.log(`Installation: ${this.config.installation}`);
    console.log(`Auth Type: ${this.config.auth_type}`);
    console.log(`API Token: ${this.apiToken ? 'Set via JIRA_API_TOKEN' : 'Not set'}`);
    
    const configSource = process.env.JIRA_CONFIG_FILE 
      ? `JIRA_CONFIG_FILE env var: ${process.env.JIRA_CONFIG_FILE}`
      : `Default: ${this.configPath}`;
    console.log(`Config Path: ${configSource}`);
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
  .option('-c, --config <file>', 'Config file (default: ~/.config/.jira/.config.yml)')
  .hook('preAction', async (thisCommand) => {
    const globalOptions = program.opts();
    const commandOptions = thisCommand.opts();
    
    const configFile = commandOptions.config || globalOptions.config;
    
    try {
      await cli.loadConfig(configFile);
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

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
  .action(async (options) => {
    try {
      await cli.generateTimesheet(options);
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current jira-cli configuration')
  .action(async () => {
    try {
      await cli.showConfig();
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test connection to Jira')
  .action(async () => {
    try {
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