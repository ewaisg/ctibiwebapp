# Project Team Management - Critical Fix Required

## Issue
The project team management functionality is currently a mock-up. Changes made in the UI are not saved to Firestore.

## Root Cause
The `onUpdate` callback only updates local React state, never calls backend to persist changes.

## Required Changes

### 1. Add Server Action Call
In `project-management.tsx`, modify the onUpdate handler:

```typescript
onUpdate={async (updatedProject) => {
  // Save to database first
  const result = await updateProject(updatedProject.id, {
    // ... existing fields
    assignedCompanies: updatedProject.assignedCompanies
  });
  
  if (result.success) {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setManagingTeamProject(updatedProject);
    toast.success("Team assignments saved successfully");
  } else {
    toast.error("Failed to save team assignments");
  }
}}
```

### 2. Update admin/actions.ts
Modify `updateProject` function to handle `assignedCompanies`:

```typescript
export async function updateProject(projectId: string, projectData: {
  // ... existing fields
  assignedCompanies?: Project['assignedCompanies'];
}): Promise<{ success: boolean; message: string; project?: Project }> {
  // ... existing code
  
  const updateData = {
    // ... existing fields
    assignedCompanies: projectData.assignedCompanies || [],
    lastModified: Timestamp.now(),
  };
  
  // ... rest of function
}
```

### 3. Add Transition State
Add loading state to ProjectTeamManagement component for better UX.

## Impact
- **Current**: Team assignments appear to save but are lost on page refresh
- **After Fix**: Team assignments will persist to Firestore and be available across sessions

## Priority: CRITICAL
This affects core business functionality for project management.