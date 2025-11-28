"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Division } from "@/types";
import { toast } from "react-hot-toast";
import { createDivision, updateDivision } from "@/app/admin/actions";

interface DivisionFormData {
  divisionName: string;
  divisionCode: string;
  isInactive: boolean;
}

interface DivisionFormProps {
  division?: Division;
  onDivisionCreated: (division: Division) => void;
  onCancel: () => void;
}

export function DivisionForm({ division, onDivisionCreated, onCancel }: DivisionFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!division;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DivisionFormData>({
    defaultValues: {
      divisionName: division?.divisionName || "",
      divisionCode: division?.divisionCode || "",
      isInactive: division?.isInactive || false,
    },
  });

  const watchedIsInactive = watch("isInactive");

  const onSubmit = (data: DivisionFormData) => {
    startTransition(async () => {
      try {
        if (isEditing && division) {
          const result = await updateDivision(division.id, {
            divisionName: data.divisionName,
            isInactive: data.isInactive,
          });
          
          if (result.success && result.division) {
            onDivisionCreated(result.division);
          } else {
            toast.error(result.message);
          }
        } else {
          const result = await createDivision({
            divisionCode: data.divisionCode,
            divisionName: data.divisionName,
            isInactive: data.isInactive,
          });
          
          if (result.success && result.division) {
            onDivisionCreated(result.division);
          } else {
            toast.error(result.message);
          }
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
          <Label htmlFor="divisionName">Division Name</Label>
          <Input
            id="divisionName"
            {...register("divisionName", { required: "Division name is required" })}
            placeholder="Engineering Division"
          />
          {errors.divisionName && (
            <p className="text-sm text-destructive">{errors.divisionName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="divisionCode">Division Code</Label>
          <Input
            id="divisionCode"
            {...register("divisionCode", { required: "Division code is required" })}
            placeholder="ENG"
            disabled={isEditing}
          />
          {errors.divisionCode && (
            <p className="text-sm text-destructive">{errors.divisionCode.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isInactive"
          checked={watchedIsInactive}
          onCheckedChange={(checked) => setValue("isInactive", checked)}
        />
        <Label htmlFor="isInactive">Inactive Division</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Division" : "Create Division")}
        </Button>
      </div>
    </form>
  );
}