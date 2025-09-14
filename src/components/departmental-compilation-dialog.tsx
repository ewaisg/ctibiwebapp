"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Archive, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { Department } from "@/types";

interface DepartmentalCompilationDialogProps {
  departments: Department[];
  onCompile: (departmentId: string, startDate: string, endDate: string) => Promise<void>;
  disabled?: boolean;
}

export function DepartmentalCompilationDialog({
  departments,
  onCompile,
  disabled = false
}: DepartmentalCompilationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDepartment || !startDate || !endDate) {
      alert("Please fill in all fields");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }

    setIsCompiling(true);
    try {
      await onCompile(selectedDepartment, startDate, endDate);
      setOpen(false);
      // Reset form
      setSelectedDepartment("");
      setStartDate("");
      setEndDate("");
    } catch (error) {
      console.error("Compilation failed:", error);
      alert("Compilation failed. Please try again.");
    } finally {
      setIsCompiling(false);
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
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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
              />
            </div>
          </div>

          {selectedDept && startDate && endDate && (
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
            {isCompiling ? "Compiling..." : "Generate Compilation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}