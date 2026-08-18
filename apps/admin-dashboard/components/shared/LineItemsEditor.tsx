"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

const DEFAULT_LINE_ITEM: LineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 18,
  amount: 0,
};

interface LineItemsEditorProps {
  value: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
}

function computeAmount(item: LineItem): number {
  const base = item.quantity * item.unitPrice;
  return parseFloat((base + (base * (item.taxRate ?? 0)) / 100).toFixed(2));
}

export function LineItemsEditor({ value, onChange, readOnly = false }: LineItemsEditorProps) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    const next = value.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...patch };
      updated.amount = computeAmount(updated);
      return updated;
    });
    onChange(next);
  };

  const add = () => onChange([...value, { ...DEFAULT_LINE_ITEM }]);

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const subtotal = value.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const tax = value.reduce(
    (s, item) => s + (item.quantity * item.unitPrice * (item.taxRate ?? 0)) / 100,
    0
  );
  const total = subtotal + tax;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_110px_80px_100px_36px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit Price (₹)</span>
        <span>Tax %</span>
        <span className="text-right">Amount (₹)</span>
        <span />
      </div>

      {value.map((item, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[1fr_80px_110px_80px_100px_36px] gap-2 items-center"
        >
          <input
            type="text"
            value={item.description}
            onChange={(e) => update(idx, { description: e.target.value })}
            placeholder="Service / Product description"
            readOnly={readOnly}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 1 })}
            readOnly={readOnly}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            value={item.unitPrice}
            onChange={(e) => update(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
            readOnly={readOnly}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={item.taxRate ?? 18}
            onChange={(e) => update(idx, { taxRate: parseFloat(e.target.value) || 0 })}
            readOnly={readOnly}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <div className="text-right text-sm font-mono font-medium text-foreground">
            ₹{computeAmount(item).toLocaleString("en-IN")}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => remove(idx)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {readOnly && <span />}
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add line item
        </button>
      )}

      {/* Totals */}
      <div className="mt-4 ml-auto w-72 space-y-1.5 border-t border-border pt-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>GST / Tax</span>
          <span className="font-mono">₹{tax.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
          <span>Total</span>
          <span className="font-mono">₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

export default LineItemsEditor;
