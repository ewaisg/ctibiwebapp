"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  PlusCircle, 
  Loader2
} from "lucide-react";
import { AutofillForm } from "./autofill-form";
import type { Project, Department } from "@/types";

interface NewInvoiceDialogProps {
  projects?: Project[];
  departments?: Department[];
}

export function NewInvoiceDialog({ projects = [], departments = [] }: NewInvoiceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  // Close dialog when pathname changes (navigation complete)
  useEffect(() => {
    if (isNavigating) {
      // Listen for invoice form ready signal
      const handleInvoiceFormReady = () => {
        if (localStorage.getItem('autofill-navigation-complete') === 'true') {
          setIsOpen(false);
          setIsNavigating(false);
          localStorage.removeItem('autofill-navigation-complete');
        }
      };

      // Check immediately and then poll
      const interval = setInterval(handleInvoiceFormReady, 100);
      
      // Also listen for storage events
      window.addEventListener('storage', handleInvoiceFormReady);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleInvoiceFormReady);
      };
    }
  }, [isNavigating]);

  const handleAutofillComplete = (data: { projectId?: string; fromDate?: Date; toDate?: Date; departmentId?: string }) => {
    setIsNavigating(true);
    
    // Navigate with autofill data
    const searchParams = new URLSearchParams({
      action: 'autofill',
      projectId: data.projectId || '',
      fromDate: data.fromDate?.toISOString() || '',
      toDate: data.toDate?.toISOString() || '',
      departmentId: data.departmentId || '',
    });
    
    router.push(`/invoicing?${searchParams.toString()}`);
  };

  const handleClose = (open: boolean) => {
    if (!open && !isNavigating) {
      setIsOpen(open);
    } else if (open) {
      setIsOpen(open);
    }
  };

  const handleButtonClick = () => {
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button onClick={handleButtonClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        {/* Loading overlay during navigation */}
        {isNavigating && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 duration-300">
            <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-medium">Loading invoice form...</p>
                <p className="text-sm text-muted-foreground">Checking for timesheet data and setting up the form</p>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Select a project to create your invoice. We&#39;ll automatically check for timesheet data and populate the invoice form accordingly.
          </DialogDescription>
        </DialogHeader>

        <div className="p-0">
          <AutofillForm
            projects={projects}
            departments={departments}
            onAutofillComplete={handleAutofillComplete}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
