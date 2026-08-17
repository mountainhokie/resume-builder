"use client";

import type { Profile } from "@/lib/schema";

export interface CoverLetterData {
  profile: Profile;
  recipientName: string;
  recipientTitle: string;
  companyName: string;
  companyAddress: string;
  opening: string;
  body: string;
  closing: string;
}

interface TemplateProps {
  data: CoverLetterData;
}

export function StandardTemplate({ data }: TemplateProps) {
  const { profile, recipientName, recipientTitle, companyName, companyAddress, opening, body, closing } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="font-serif text-sm leading-relaxed text-gray-900 p-8 bg-white" id="cover-letter-content">
      {/* Sender Info */}
      <div className="mb-6">
        <p className="font-bold">{profile.firstName} {profile.lastName}</p>
        {profile.address && <p>{profile.address}</p>}
        {profile.phone && <p>{profile.phone}</p>}
        {profile.email && <p>{profile.email}</p>}
      </div>

      <p className="mb-6">{today}</p>

      {/* Recipient */}
      {(recipientName || companyName) && (
        <div className="mb-6">
          {recipientName && <p>{recipientName}</p>}
          {recipientTitle && <p>{recipientTitle}</p>}
          {companyName && <p>{companyName}</p>}
          {companyAddress && <p className="whitespace-pre-line">{companyAddress}</p>}
        </div>
      )}

      <p className="mb-4">Dear {recipientName || "Hiring Manager"},</p>

      {opening && <p className="mb-4 whitespace-pre-line">{opening}</p>}
      {body && <p className="mb-4 whitespace-pre-line">{body}</p>}
      {closing && <p className="mb-6 whitespace-pre-line">{closing}</p>}

      <div>
        <p>Sincerely,</p>
        <p className="mt-4 font-bold">{profile.firstName} {profile.lastName}</p>
      </div>
    </div>
  );
}

export function ModernCoverTemplate({ data }: TemplateProps) {
  const { profile, recipientName, recipientTitle, companyName, companyAddress, opening, body, closing } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="font-sans text-sm leading-relaxed text-gray-800 bg-white" id="cover-letter-content">
      {/* Header */}
      <div className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-light">
          {profile.firstName} <span className="font-bold">{profile.lastName}</span>
        </h1>
        {profile.positionTitle && (
          <p className="text-blue-200 mt-1">{profile.positionTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-blue-100">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.address && <span>{profile.address}</span>}
        </div>
      </div>

      <div className="px-8 py-6">
        <p className="text-gray-400 text-xs mb-4">{today}</p>

        {(recipientName || companyName) && (
          <div className="mb-4 text-sm">
            {recipientName && <p className="font-medium">{recipientName}</p>}
            {recipientTitle && <p className="text-gray-500">{recipientTitle}</p>}
            {companyName && <p className="text-gray-500">{companyName}</p>}
            {companyAddress && <p className="text-gray-500 whitespace-pre-line">{companyAddress}</p>}
          </div>
        )}

        <p className="mb-4 font-medium">Dear {recipientName || "Hiring Manager"},</p>

        {opening && <p className="mb-4 whitespace-pre-line">{opening}</p>}
        {body && <p className="mb-4 whitespace-pre-line">{body}</p>}
        {closing && <p className="mb-6 whitespace-pre-line">{closing}</p>}

        <div className="border-t border-gray-200 pt-4 mt-6">
          <p className="text-gray-500">Best regards,</p>
          <p className="mt-2 font-bold text-blue-700">
            {profile.firstName} {profile.lastName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MinimalCoverTemplate({ data }: TemplateProps) {
  const { profile, recipientName, companyName, opening, body, closing } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="font-sans text-sm leading-relaxed text-gray-800 p-8 bg-white" id="cover-letter-content">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h1>
          {profile.positionTitle && (
            <p className="text-gray-500 text-xs">{profile.positionTitle}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">
          {profile.email && <p>{profile.email}</p>}
          {profile.phone && <p>{profile.phone}</p>}
          <p>{today}</p>
        </div>
      </div>

      <hr className="border-gray-200 mb-6" />

      {companyName && (
        <p className="text-xs text-gray-400 mb-4">To: {companyName}</p>
      )}

      <p className="mb-4">Dear {recipientName || "Hiring Manager"},</p>

      {opening && <p className="mb-3 whitespace-pre-line">{opening}</p>}
      {body && <p className="mb-3 whitespace-pre-line">{body}</p>}
      {closing && <p className="mb-6 whitespace-pre-line">{closing}</p>}

      <p className="text-gray-500">Regards,</p>
      <p className="mt-2 font-semibold">{profile.firstName} {profile.lastName}</p>
    </div>
  );
}

export const coverLetterTemplates = {
  standard: { name: "Standard", component: StandardTemplate },
  modern: { name: "Modern", component: ModernCoverTemplate },
  minimal: { name: "Minimal", component: MinimalCoverTemplate },
};
