"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contract } from "@/types";
import { toast } from "react-hot-toast";

interface ContractFormData {
  contractName: string;
  contractNumber: number;
  clientName: string;
  contractEffectiveDate: string;
  contractCapacity: number;
  contractDuration: string;
  supplierContractNumber?: string;
  mwbeGoalPercent: number;
}

interface ContractFormProps {
  contract?: Contract;
  onContractCreated: (contract: Contract) => void;
  onCancel: () => void;
}

export function ContractForm({ contract, onContractCreated, onCancel }: ContractFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!contract;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContractFormData>({
    defaultValues: {
      contractName: contract?.contractName || "",
      contractNumber: contract?.contractNumber || 0,
      clientName: contract?.clientName || "",
      contractEffectiveDate: contract?.contractEffectiveDate 
        ? new Date(typeof contract.contractEffectiveDate === 'object' && 'seconds' in contract.contractEffectiveDate 
            ? contract.contractEffectiveDate.seconds * 1000 
            : contract.contractEffectiveDate as string).toISOString().split('T')[0]
        : "",
      contractCapacity: contract?.contractCapacity || 0,
      contractDuration: contract?.contractDuration || "",
      supplierContractNumber: contract?.supplierContractNumber || "",
      mwbeGoalPercent: contract?.mwbeGoalPercent || 0,
    },
  });

  const onSubmit = (data: ContractFormData) => {
    startTransition(async () => {
      try {
        // Mock contract creation - replace with actual API call
        const newContract: Contract = {
          id: contract?.id || `contract_${Date.now()}`,
          contractName: data.contractName,
          contractNumber: data.contractNumber,
          clientId: null as any, // Will be set based on clientName
          clientName: data.clientName,
          contractEffectiveDate: new Date(data.contractEffectiveDate) as any,
          contractCapacity: data.contractCapacity,
          contractDuration: data.contractDuration,
          supplierContractNumber: data.supplierContractNumber,
          mwbeGoalPercent: data.mwbeGoalPercent,
        };

        onContractCreated(newContract);
      } catch (error) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractName">Contract Name</Label>
          <Input
            id="contractName"
            {...register("contractName", { required: "Contract name is required" })}
            placeholder="Professional Services Agreement"
          />
          {errors.contractName && (
            <p className="text-sm text-destructive">{errors.contractName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractNumber">Contract Number</Label>
          <Input
            id="contractNumber"
            type="number"
            {...register("contractNumber", { 
              required: "Contract number is required",
              valueAsNumber: true 
            })}
            placeholder="12345"
          />
          {errors.contractNumber && (
            <p className="text-sm text-destructive">{errors.contractNumber.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name</Label>
        <Input
          id="clientName"
          {...register("clientName", { required: "Client name is required" })}
          placeholder="ABC Corporation"
        />
        {errors.clientName && (
          <p className="text-sm text-destructive">{errors.clientName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractEffectiveDate">Effective Date</Label>
          <Input
            id="contractEffectiveDate"
            type="date"
            {...register("contractEffectiveDate", { required: "Effective date is required" })}
          />
          {errors.contractEffectiveDate && (
            <p className="text-sm text-destructive">{errors.contractEffectiveDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractCapacity">Contract Capacity ($)</Label>
          <Input
            id="contractCapacity"
            type="number"
            step="0.01"
            {...register("contractCapacity", { 
              required: "Contract capacity is required",
              valueAsNumber: true,
              min: { value: 0, message: "Must be a positive amount" }
            })}
            placeholder="100000.00"
          />
          {errors.contractCapacity && (
            <p className="text-sm text-destructive">{errors.contractCapacity.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractDuration">Contract Duration</Label>
          <Input
            id="contractDuration"
            {...register("contractDuration", { required: "Contract duration is required" })}
            placeholder="12 months"
          />
          {errors.contractDuration && (
            <p className="text-sm text-destructive">{errors.contractDuration.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mwbeGoalPercent">MWBE Goal (%)</Label>
          <Input
            id="mwbeGoalPercent"
            type="number"
            step="0.1"
            {...register("mwbeGoalPercent", { 
              required: "MWBE goal is required",
              valueAsNumber: true,
              min: { value: 0, message: "Must be 0 or greater" },
              max: { value: 100, message: "Must be 100 or less" }
            })}
            placeholder="15.0"
          />
          {errors.mwbeGoalPercent && (
            <p className="text-sm text-destructive">{errors.mwbeGoalPercent.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplierContractNumber">Supplier Contract Number (Optional)</Label>
        <Input
          id="supplierContractNumber"
          {...register("supplierContractNumber")}
          placeholder="SUP-12345"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Contract" : "Create Contract")}
        </Button>
      </div>
    </form>
  );
}