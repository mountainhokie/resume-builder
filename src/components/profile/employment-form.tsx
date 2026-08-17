"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Plus, Trash2, GripVertical } from "lucide-react";

export interface DutyEntry {
  id: string;
  text: string;
}

export interface EmploymentEntry {
  id?: string;
  companyName: string;
  location: string;
  positionTitle: string;
  monthFrom: number | null;
  yearFrom: number | null;
  monthTo: number | null;
  yearTo: number | null;
  isCurrent: boolean;
  duties: DutyEntry[];
}

const monthOptions = [
  { value: "", label: "Month" },
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function generateId() {
  return crypto.randomUUID();
}

interface EmploymentFormProps {
  entries: EmploymentEntry[];
  onChange: (entries: EmploymentEntry[]) => void;
}

function emptyEmployment(): EmploymentEntry {
  return {
    companyName: "",
    location: "",
    positionTitle: "",
    monthFrom: null,
    yearFrom: null,
    monthTo: null,
    yearTo: null,
    isCurrent: false,
    duties: [],
  };
}

export function EmploymentForm({ entries, onChange }: EmploymentFormProps) {
  const addEntry = () => {
    onChange([...entries, emptyEmployment()]);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof EmploymentEntry,
    value: string | number | boolean | null | DutyEntry[]
  ) => {
    const updated = entries.map((entry, i) => {
      if (i !== index) return entry;
      const newEntry = { ...entry, [field]: value };
      if (field === "isCurrent" && value === true) {
        newEntry.yearTo = null;
      }
      return newEntry;
    });
    onChange(updated);
  };

  const addDuty = (empIndex: number) => {
    const duties = [...entries[empIndex].duties, { id: generateId(), text: "" }];
    updateEntry(empIndex, "duties", duties);
  };

  const updateDuty = (empIndex: number, dutyIndex: number, text: string) => {
    const duties = entries[empIndex].duties.map((d, i) =>
      i === dutyIndex ? { ...d, text } : d
    );
    updateEntry(empIndex, "duties", duties);
  };

  const removeDuty = (empIndex: number, dutyIndex: number) => {
    const duties = entries[empIndex].duties.filter((_, i) => i !== dutyIndex);
    updateEntry(empIndex, "duties", duties);
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          No employment entries yet. Click &quot;Add Employment&quot; to get
          started.
        </p>
      )}

      {entries.map((entry, index) => (
        <Card key={index}>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Employment #{index + 1}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={entry.companyName}
                onChange={(e) =>
                  updateEntry(index, "companyName", e.target.value)
                }
                placeholder="Acme Inc."
              />
              <Input
                label="Position Title"
                value={entry.positionTitle}
                onChange={(e) =>
                  updateEntry(index, "positionTitle", e.target.value)
                }
                placeholder="Software Engineer"
              />
            </div>

            <Input
              label="Location"
              value={entry.location}
              onChange={(e) =>
                updateEntry(index, "location", e.target.value)
              }
              placeholder="City, State"
            />

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={entry.monthFrom ?? ""}
                      onChange={(e) =>
                        updateEntry(index, "monthFrom", e.target.value ? parseInt(e.target.value) : null)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      value={entry.yearFrom ?? ""}
                      onChange={(e) =>
                        updateEntry(index, "yearFrom", e.target.value ? parseInt(e.target.value) : null)
                      }
                      placeholder="Year"
                    />
                  </div>
                </div>
                {!entry.isCurrent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={entry.monthTo ?? ""}
                        onChange={(e) =>
                          updateEntry(index, "monthTo", e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {monthOptions.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        value={entry.yearTo ?? ""}
                        onChange={(e) =>
                          updateEntry(index, "yearTo", e.target.value ? parseInt(e.target.value) : null)
                        }
                        placeholder="Year"
                      />
                    </div>
                  </div>
                )}
              </div>
              <Toggle
                label="Current Position"
                checked={entry.isCurrent}
                onChange={(checked) =>
                  updateEntry(index, "isCurrent", checked)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duties & Responsibilities
              </label>
              <div className="space-y-2">
                {entry.duties.map((duty, dutyIndex) => (
                  <div key={duty.id} className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300 mt-2.5 shrink-0" />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={duty.text}
                        onChange={(e) => updateDuty(index, dutyIndex, e.target.value)}
                        placeholder="Describe a responsibility or achievement..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDuty(index, dutyIndex)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDuty(index)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Duty
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Employment
      </Button>
    </div>
  );
}
