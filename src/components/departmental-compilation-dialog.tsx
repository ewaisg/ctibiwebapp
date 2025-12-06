"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Archive, Calendar, Building2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Department } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface DepartmentalCompilationDialogProps {
  departments: Department[];
  disabled?: boolean;
  // Optional for backward compatibility, but ignored in new implementation
  onCompile?: (departmentId: string, startDate: string, endDate: string) => Promise<void>;
}

export function DepartmentalCompilationDialog({
  departments,
  disabled = false
}: DepartmentalCompilationDialogProps) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async () => {
    if (!selectedDepartment || !startDate || !endDate) {
      toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Invalid dates", description: "Start date must be before end date", variant: "destructive" });
      return;
    }

    if (!firebaseUser) {
      toast({ title: "Authentication Error", description: "Please sign in again", variant: "destructive" });
      return;
    }

    setIsCompiling(true);
    setProgress(0);
    setStatusMessage("Initializing...");

    const compilationId = `compilation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const idToken = await firebaseUser.getIdToken();
      
      // Start polling
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/departmental-compilation?compilationId=${compilationId}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'processing' && data.total > 0) {
              const percentage = Math.round((data.processed / data.total) * 90); // Cap at 90% until done
              setProgress(percentage);
              setStatusMessage(`Processing invoice ${data.processed} of ${data.total}...`);
            } else if (data.status === 'compressing') {
              setProgress(95);
              setStatusMessage("Compressing files...");
            } else if (data.status === 'fetching') {
              setStatusMessage("Fetching data...");
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1000);

      const response = await fetch('/api/departmental-compilation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ departmentId: selectedDepartment, startDate, endDate, compilationId })
      });

      clearInterval(pollInterval);

      if (response.ok) {
        setProgress(100);
        setStatusMessage("Download starting...");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename="')[1]?.split('"')[0]
          : `departmental-compilation-${selectedDepartment}-${new Date().toISOString().split('T')[0]}.zip`;
          
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast({ title: "Success", description: "Compilation downloaded successfully" });
        setOpen(false);
        setSelectedDepartment("");
        setStartDate("");
        setEndDate("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Compilation failed');
      }
    } catch (error: any) {
      console.error("Compilation failed:", error);
      toast({ title: "Compilation failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCompiling(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  const selectedDept = departments.find(d => d.id === selectedDepartment);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Archive className="mr-2 h-4 w-4" />
          Compile by Department
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departmental Compilation
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive ZIP file containing all invoice submissions, 
            timecard reports, attachments, and departmental summary for the selected 
            department and date range.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isCompiling}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.departmentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isCompiling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isCompiling}
              />
            </div>
          </div>

          {isCompiling && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {selectedDept && startDate && endDate && !isCompiling && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">Compilation Preview:</p>
              <p className="text-muted-foreground">
                Department: <span className="font-medium">{selectedDept.departmentName}</span>
              </p>
              <p className="text-muted-foreground">
                Period: <span className="font-medium">
                  {format(new Date(startDate + 'T00:00:00'), 'MMM dd, yyyy')} - {format(new Date(endDate + 'T23:59:59'), 'MMM dd, yyyy')}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCompiling}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedDepartment || !startDate || !endDate || isCompiling}
          >
            {isCompiling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compiling...
              </>
            ) : (
              "Generate Compilation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}