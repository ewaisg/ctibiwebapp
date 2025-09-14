"use client";

import React, { useState, useTransition } from "react";
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
import { createUser, updateUser } from "@/app/admin/actions";
import type { User, Company, UserRole } from "@/types";
import { toast } from "react-hot-toast";

interface UserFormData {
  displayName: string;
  email: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  phone?: string;
  bio?: string;
}

interface UserFormProps {
  companies: Company[];
  user?: User;
  onUserCreated: (user: User) => void;
  onCancel: () => void;
}

export function UserForm({ companies, user, onUserCreated, onCancel }: UserFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      role: user?.role || "Prime",
      companyId: (user?.companyId as string) || "",
      isActive: user?.isActive ?? true,
      phone: user?.phone || "",
      bio: user?.bio || "",
    },
  });

  const watchedRole = watch("role");
  const watchedIsActive = watch("isActive");

  const onSubmit = (data: UserFormData) => {
    startTransition(async () => {
      try {
        let result;
        if (isEditing) {
          result = await updateUser(user.uid, data);
        } else {
          result = await createUser(data);
        }

        if (result.success) {
          onUserCreated(result.user!);
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
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            {...register("displayName", { required: "Display name is required" })}
            placeholder="John Doe"
          />
          {errors.displayName && (
            <p className="text-sm text-destructive">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email", { 
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            placeholder="john@company.com"
            disabled={isEditing}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={watchedRole}
            onValueChange={(value: UserRole) => setValue("role", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Prime">Prime (Internal)</SelectItem>
              <SelectItem value="Subconsultant">Subconsultant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyId">Company</Label>
          <Select
            value={watch("companyId")}
            onValueChange={(value) => setValue("companyId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.companyId && (
            <p className="text-sm text-destructive">Company is required</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          {...register("phone")}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio (Optional)</Label>
        <Input
          id="bio"
          {...register("bio")}
          placeholder="Brief description about the user"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={watchedIsActive}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
        <Label htmlFor="isActive">Active User</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update User" : "Create User")}
        </Button>
      </div>
    </form>
  );
}