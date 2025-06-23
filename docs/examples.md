# Usage Examples

Practical examples and workflows for the Bear MCP Server.

## 🎯 Common Workflows

### Getting Started - Basic Operations

#### Explore Your Bear Database
```
"What's in my Bear database?"
"Show me my database statistics"
"How many notes do I have?"
```

#### Browse Your Notes
```
"Show me my recent notes"
"List my 10 most recent notes"
"What notes do I have tagged with 'work'?"
"Find notes containing 'project' in the title"
```

#### Explore Your Tags
```
"What tags do I use most?"
"Show me all my Bear tags"
"How many notes are tagged with 'personal'?"
```

### Content Discovery and Search

#### Basic Search
```
"Search for notes about 'machine learning'"
"Find notes containing 'API documentation'"
"Show me notes with 'meeting' in the title"
```

#### Advanced Search
```
"Find notes tagged 'work' but not 'archived', created after January 1st"
"Search for notes containing 'JavaScript' with fuzzy matching"
"Find notes longer than 1000 characters tagged with 'research'"
```

#### Content Analysis
```
"Find notes similar to this content: 'React hooks and state management'"
"What notes are related to note ID 123?"
"Analyze my note-taking patterns this month"
```

### Organization and Management

#### Create and Edit Notes
```
"Create a new note titled 'Daily Standup' with tags 'work' and 'meetings'"
"Update note 123 to add 'urgent' tag"
"Duplicate my 'Template' note with suffix ' - New Project'"
```

#### Tag Management and Validation
```
"Create a note with tags 'Project-Alpha' and 'work meeting'"
# Result: Tags become 'projectalpha' and 'workmeeting' with warnings

"Add tags 'project/frontend' and 'JavaScript_React' to note 456"
# Result: 'project/frontend' stays, 'JavaScript_React' becomes 'javascriptreact'

"Create a note with nested tags 'work/projects/2024' and 'personal/health'"
# Result: Both tags preserved as nested tags work with forward slashes
```

#### Archive and Organize
```
"Archive note 456"
"Find old notes I should archive"
"Show me notes with attachments"
```

## 📚 Detailed Scenarios

### Scenario 1: Research Project Management

**Goal**: Organize research notes for a machine learning project

#### Step 1: Assess Current State
```
"Find all notes tagged with 'machine-learning' or 'ML'"
"Search for notes containing 'neural network' or 'deep learning'"
"Show me notes with attachments tagged 'research'"
```

#### Step 2: Create Project Structure
```
"Create a new note titled 'ML Project Overview' with tags 'machine-learning' and 'project-overview'"
"Create a note titled 'Research Papers' with content 'Collection of relevant papers' and tags 'machine-learning' and 'references'"
```

#### Step 3: Organize Existing Content
```
"Find notes similar to 'neural networks and backpropagation algorithms'"
"Update note 789 to add tags 'machine-learning' and 'neural-networks'"
"Archive old notes tagged 'ml-draft' created before 2023"
```

#### Step 4: Analysis and Insights
```
"Analyze my note-taking patterns for machine learning topics"
"What are my most-used tags related to 'machine-learning'?"
"Find duplicate or similar notes in my research collection"
```

### Scenario 2: Meeting Notes Management

**Goal**: Streamline meeting notes and follow-ups

#### Step 1: Inventory Current Meetings
```
"Find all notes tagged with 'meeting' or 'meetings'"
"Show me meeting notes from the last month"
"What meeting notes have todos or action items?"
```

#### Step 2: Create Meeting Templates
```
"Create a note titled 'Weekly Team Meeting Template' with content:
# Weekly Team Meeting - [Date]

## Attendees
- 

## Agenda
1. 
2. 
3. 

## Action Items
- [ ] 
- [ ] 

## Next Meeting
Date: 
Topics: 

Tags: meetings, team, weekly"
```

#### Step 3: Organize Past Meetings
```
"Find meeting notes without proper tags"
"Update meeting notes from January to add 'Q1-2024' tag"
"Archive meeting notes older than 6 months"
```

#### Step 4: Follow-up Management
```
"Find meeting notes with incomplete todos"
"Search for action items assigned to specific people"
"Create a summary note of all Q1 meeting outcomes"
```

### Scenario 3: Knowledge Base Cleanup

**Goal**: Clean up and optimize your Bear knowledge base

#### Step 1: Database Analysis
```
"Analyze my note metadata and content patterns"
"What are my longest and shortest notes?"
"Show me notes that might need better organization"
```

#### Step 2: Find Duplicates and Similar Content
```
"Find duplicate or very similar notes"
"Search for notes with similar titles"
"Identify notes that could be merged"
```

#### Step 3: Tag Optimization
```
"Analyze my tag usage and suggest improvements"
"Find orphaned or rarely used tags"
"Show me tag hierarchy and relationships"
```

#### Step 4: Content Enhancement
```
"Find notes without tags that should have them"
"Identify notes that need better titles"
"Find notes with broken links or missing attachments"
```

### Scenario 4: Content Migration and Backup

**Goal**: Backup and migrate Bear content

#### Step 1: Comprehensive Backup
```
"Show me my database statistics for backup planning"
"List all file attachments with their sizes"
"Get a complete inventory of my notes and tags"
```

#### Step 2: Selective Export Planning
```
"Find notes created in the last year for migration"
"Show me notes with specific tags for selective backup"
"Identify notes with attachments that need special handling"
```

### Scenario 5: Tag Organization and Cleanup

**Goal**: Optimize tag usage and create a consistent tagging system

#### Step 1: Tag Analysis
```
"Analyze my tag usage patterns and suggest improvements"
"Show me all tags and their usage counts"
"Find tags that might be duplicates or need consolidation"
```

#### Step 2: Tag Standardization
```
"Create a note with standardized project tags using nested structure"
"Update old notes to use consistent tag format"
"Convert old tags like 'Project-Alpha' to clean format"
```

#### Step 3: Tag Hierarchy Planning
```
"Plan a tag hierarchy for work projects: work/project/alpha"
"Create template notes with proper nested tag examples"
"Document tag conventions for consistent future use"
```

## 🏷️ Tag Best Practices

### ✅ Recommended Tag Formats
- **Simple tags**: `work`, `personal`, `urgent`
- **Nested categories**: `work/projects/alpha`, `personal/health/fitness`
- **Time-based**: `2024`, `q1`, `january`
- **Status indicators**: `todo`, `inprogress`, `completed`
- **Project codes**: `proj001`, `alpha`, `beta`

### ❌ Tags to Avoid (Auto-Sanitized)
- **With hyphens**: `project-alpha` → becomes `projectalpha`
- **With spaces**: `work meeting` → becomes `workmeeting`
- **With underscores**: `project_alpha` → becomes `projectalpha`
- **Mixed case**: `ProjectAlpha` → becomes `projectalpha`
- **With commas**: `work,urgent` → becomes `workurgent`

### 💡 Pro Tips
- Use forward slashes for hierarchy: `work/projects/2024/alpha`
- Keep tags short and memorable
- Be consistent with naming conventions
- Use nested tags for better organization
- Let the server handle tag validation automatically

#### Step 3: Content Verification
```
"Verify database integrity and health"
"Check for any corrupted or problematic notes"
"Ensure all tags and relationships are intact"
```

## 🔧 Advanced Use Cases

### Automated Content Analysis

#### Writing Pattern Analysis
```
"Analyze my writing patterns and productivity trends"
"What times of day do I create most notes?"
"How has my note-taking evolved over time?"
```

#### Content Quality Assessment
```
"Find notes that might need more detail or structure"
"Identify notes with poor formatting or organization"
"Show me notes that could benefit from better tags"
```

#### Knowledge Gap Identification
```
"Find topics I've started but not completed"
"Identify areas where I have sparse documentation"
"Show me potential connections between isolated notes"
```

### Bulk Operations and Maintenance

#### Bulk Tag Management
```
"Find all notes tagged 'old-project' and update them to 'archived-project'"
"Add 'needs-review' tag to all notes older than 1 year"
"Standardize tag naming conventions across all notes"
```

#### Content Maintenance
```
"Find notes with outdated information or broken links"
"Identify notes that reference deprecated tools or methods"
"Update project status across multiple related notes"
```

#### Archive Management
```
"Archive all completed project notes from 2023"
"Find notes that should be archived based on age and usage"
"Create archive summaries for major projects"
```

## 💡 Pro Tips and Best Practices

### Efficient Searching

#### Use Specific Terms
```
✅ Good: "Find notes about 'React hooks useState'"
❌ Avoid: "Find notes about programming"
```

#### Combine Multiple Criteria
```
✅ Good: "Find notes tagged 'work' created after January 1st with 'API' in title"
❌ Avoid: Multiple separate queries
```

#### Use Pagination for Large Results
```
✅ Good: "Show me first 20 notes tagged 'research', then next 20"
❌ Avoid: Requesting all results at once for large datasets
```

### Effective Organization

#### Consistent Tagging Strategy
```
✅ Good: Use hierarchical tags like 'project/web-app', 'meeting/weekly'
❌ Avoid: Inconsistent tag naming like 'proj', 'project', 'projects'
```

#### Descriptive Titles
```
✅ Good: "Weekly Team Meeting - Feb 18, 2024"
❌ Avoid: "Meeting", "Notes", "Untitled"
```

#### Regular Maintenance
```
✅ Good: Monthly cleanup and organization sessions
❌ Avoid: Letting organization problems accumulate
```

### Safety and Reliability

#### Test Before Bulk Operations
```
✅ Good: Test write operations on a few notes first
❌ Avoid: Running bulk operations without testing
```

#### Use Read Operations Freely
```
✅ Good: Explore and analyze with read operations
❌ Avoid: Being hesitant to use analysis tools
```

#### Keep Bear Updated
```
✅ Good: Regular Bear app updates for schema compatibility
❌ Avoid: Using outdated Bear versions
```

## 🚨 Common Pitfalls and Solutions

### Issue: Too Many Results
**Problem**: Queries returning thousands of results
**Solution**: Use pagination and more specific criteria
```
Instead of: "Show me all my notes"
Try: "Show me my 20 most recent notes" or "Find notes tagged 'current-project'"
```

### Issue: Bear Process Running
**Problem**: Write operations blocked by running Bear
**Solution**: Quit Bear completely before write operations
```
1. Quit Bear app completely
2. Check Activity Monitor for Bear processes
3. Then perform write operations
```

### Issue: Unclear Search Results
**Problem**: Getting unexpected or irrelevant results
**Solution**: Use more specific search terms and filters
```
Instead of: "Find notes about work"
Try: "Find notes tagged 'work' containing 'project status' created this month"
```

### Issue: Performance Slowdown
**Problem**: Slow responses with large databases
**Solution**: Use pagination and specific filters
```
Instead of: Broad searches on large databases
Try: Use date ranges, tag filters, and limit parameters
```

## 📊 Example Responses

### Database Statistics Response
```json
{
  "totalNotes": 1247,
  "activeNotes": 1089,
  "trashedNotes": 158,
  "archivedNotes": 45,
  "encryptedNotes": 8,
  "totalTags": 127,
  "totalAttachments": 234,
  "databaseSize": 45728640,
  "lastModified": "2024-02-18T15:30:22Z"
}
```

### Search Results Response
```json
[
  {
    "Z_PK": 123,
    "ZTITLE": "Machine Learning Project Overview",
    "ZTEXT": "# ML Project\n\nThis project focuses on...",
    "ZCREATIONDATE": 760349412.183326,
    "ZMODIFICATIONDATE": 760349412.183326,
    "ZTRASHED": 0,
    "ZARCHIVED": 0,
    "ZPINNED": 1,
    "ZENCRYPTED": 0,
    "tags": ["machine-learning", "project", "overview"],
    "relevanceScore": 0.95,
    "matchedTerms": ["machine", "learning"],
    "snippets": ["This project focuses on machine learning algorithms..."]
  }
]
```

### Note Creation Response
```json
{
  "noteId": 1248,
  "success": true,
  "backupPath": "/Users/user/Documents/Bear MCP Backups/backup_20240218_153022.sqlite"
}
```

## 🔄 Workflow Templates

### Daily Note Review Workflow
1. `"Show me notes created or modified today"`
2. `"Find notes with incomplete todos"`
3. `"Check for meeting notes needing follow-up"`
4. `"Identify notes that need better tags or organization"`

### Weekly Cleanup Workflow
1. `"Analyze my note-taking patterns this week"`
2. `"Find notes that might be duplicates"`
3. `"Identify notes without proper tags"`
4. `"Archive completed project notes"`
5. `"Create weekly summary note"`

### Monthly Organization Workflow
1. `"Get comprehensive database statistics"`
2. `"Analyze tag usage and suggest optimizations"`
3. `"Find notes older than 6 months for potential archiving"`
4. `"Review and update project status notes"`
5. `"Create monthly knowledge base health report"`

### Project Kickoff Workflow
1. `"Create project overview note with standard template"`
2. `"Set up project-specific tags and organization"`
3. `"Find related existing notes and tag them appropriately"`
4. `"Create project milestone and tracking notes"`
5. `"Establish project documentation structure"`

---

**Next Steps**: 
- Check out the [API Reference](api-reference.md) for detailed tool documentation
- Review [Troubleshooting](troubleshooting.md) for common issues and solutions
- Explore [Advanced Workflows](advanced-workflows.md) for power user techniques 