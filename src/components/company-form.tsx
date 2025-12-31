"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createCompany, updateCompany } from "@/app/(authenticated)/admin/admin-company-actions";
import type { Company } from "@/types";
import { toast } from "react-hot-toast";

interface CompanyFormData {
  companyName: string;
  companyCode: string;
  isSubconsultant: boolean;
  isInactive: boolean;
  diversityCertification: 'MWBE' | 'WBE' | 'SBE' | 'None';
}

interface CompanyFormProps {
  company?: Company;
  onCompanyCreated: (company: Company) => void;
  onCancel: () => void;
}

export function CompanyForm({ company, onCompanyCreated, onCancel }: CompanyFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!company;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormData>({
    defaultValues: {
      companyName: company?.companyName || "",
      companyCode: company?.companyCode || "",
      isSubconsultant: company?.isSubconsultant || false,
      isInactive: company?.isInactive || false,
      diversityCertification: company?.diversityCertification || 'None',
    },
  });

  const watchedIsSubconsultant = watch("isSubconsultant");
  const watchedIsInactive = watch("isInactive");
  const watchedDiversityCertification = watch("diversityCertification");

  const onSubmit = (data: CompanyFormData) => {
    startTransition(async () => {
      try {
        let result;
        if (isEditing) {
          result = await updateCompany(company.id, data);
        } else {
          result = await createCompany(data);
        }

        if (result.success) {
          onCompanyCreated(result.company!);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            {...register("companyName", { required: "Company name is required" })}
            placeholder="Acme Corporation"
          />
          {errors.companyName && (
            <p className="text-sm text-destructive">{errors.companyName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyCode">Company Code</Label>
          <Input
            id="companyCode"
            {...register("companyCode", { required: "Company code is required" })}
            placeholder="ACME"
            disabled={isEditing}
          />
          {errors.companyCode && (
            <p className="text-sm text-destructive">{errors.companyCode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="diversityCertification">Diversity Certification</Label>
        <Select
          value={watchedDiversityCertification}
          onValueChange={(value: 'MWBE' | 'WBE' | 'SBE' | 'None') => setValue("diversityCertification", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select certification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="MWBE">MWBE (Minority/Women Business Enterprise)</SelectItem>
            <SelectItem value="WBE">WBE (Women Business Enterprise)</SelectItem>
            <SelectItem value="SBE">SBE (Small Business Enterprise)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isSubconsultant"
            checked={watchedIsSubconsultant}
            onCheckedChange={(checked) => setValue("isSubconsultant", checked)}
          />
          <Label htmlFor="isSubconsultant">Subconsultant Company</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isInactive"
            checked={watchedIsInactive}
            onCheckedChange={(checked) => setValue("isInactive", checked)}
          />
          <Label htmlFor="isInactive">Inactive Company</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Company" : "Create Company")}
        </Button>
      </div>
    </form>
  );
}