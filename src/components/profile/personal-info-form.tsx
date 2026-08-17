"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useRef, KeyboardEvent, DragEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  positionTitle: string;
  skills: string[];
  portfolio: string;
  github: string;
  linkedin: string;
  summary: string;
}

interface PersonalInfoFormProps {
  data: PersonalInfoData;
  onChange: (data: PersonalInfoData) => void;
}

export function PersonalInfoForm({ data, onChange }: PersonalInfoFormProps) {
  const [skillInput, setSkillInput] = useState("");
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleChange = (field: keyof PersonalInfoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !data.skills.includes(skill)) {
      onChange({ ...data, skills: [...data.skills, skill] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    onChange({ ...data, skills: data.skills.filter((s) => s !== skill) });
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...data.skills];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onChange({ ...data, skills: reordered });
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="firstName"
          label="First Name"
          value={data.firstName}
          onChange={(e) => handleChange("firstName", e.target.value)}
          placeholder="John"
          required
        />
        <Input
          id="lastName"
          label="Last Name"
          value={data.lastName}
          onChange={(e) => handleChange("lastName", e.target.value)}
          placeholder="Doe"
          required
        />
      </div>

      <Input
        id="email"
        label="Email"
        type="email"
        value={data.email}
        onChange={(e) => handleChange("email", e.target.value)}
        placeholder="john@example.com"
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="phone"
          label="Phone Number"
          type="tel"
          value={data.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          placeholder="(555) 123-4567"
        />
        <Input
          id="positionTitle"
          label="Position Title"
          value={data.positionTitle}
          onChange={(e) => handleChange("positionTitle", e.target.value)}
          placeholder="Software Engineer"
        />
      </div>

      <Input
        id="address"
        label="Address"
        value={data.address}
        onChange={(e) => handleChange("address", e.target.value)}
        placeholder="123 Main St, City, State 12345"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          id="portfolio"
          label="Portfolio URL"
          value={data.portfolio}
          onChange={(e) => handleChange("portfolio", e.target.value)}
          placeholder="https://portfolio.com"
        />
        <Input
          id="github"
          label="GitHub"
          value={data.github}
          onChange={(e) => handleChange("github", e.target.value)}
          placeholder="https://github.com/username"
        />
        <Input
          id="linkedin"
          label="LinkedIn"
          value={data.linkedin}
          onChange={(e) => handleChange("linkedin", e.target.value)}
          placeholder="https://linkedin.com/in/username"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skills
        </label>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter"
          />
          <Button type="button" onClick={addSkill} variant="outline">
            Add
          </Button>
        </div>
        {data.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {data.skills.map((skill, index) => (
              <div
                key={skill}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "transition-all",
                  dragOverIndex === index && "ring-2 ring-blue-400 rounded-full"
                )}
              >
                <Badge variant="info" onRemove={() => removeSkill(skill)}>
                  <GripVertical className="h-3 w-3 text-blue-400 cursor-grab active:cursor-grabbing shrink-0" />
                  {skill}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <Textarea
        id="summary"
        label="Professional Summary"
        value={data.summary}
        onChange={(e) => handleChange("summary", e.target.value)}
        placeholder="Briefly describe your professional background, key strengths, and career objectives..."
        className="min-h-[120px]"
      />
    </div>
  );
}
