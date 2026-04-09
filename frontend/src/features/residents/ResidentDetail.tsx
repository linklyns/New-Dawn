import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FileText,
  Home,
  GraduationCap,
  HeartPulse,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { ResidentForm } from './ResidentForm';
import type { ResidentFormData } from './ResidentForm';
import type { Resident, Safehouse } from '../../types/models';
import type { RiskPrediction, ReintegrationFactor } from '../../types/predictions';

type Tab = 'overview' | 'family' | 'admission' | 'case';

function statusVariant(s: string): 'success' | 'neutral' | 'info' {
  switch (s) {
    case 'Active': return 'success';
    case 'Closed': return 'neutral';
    case 'Transferred': return 'info';
    default: return 'neutral';
  }
}

function riskVariant(r: string): 'danger' | 'warning' | 'info' | 'success' {
  switch (r) {
    case 'Critical': return 'danger';
    case 'High': return 'warning';
    case 'Medium': return 'info';
    case 'Low': return 'success';
    default: return 'info';
  }
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
        {label}
      </span>
      <span className="text-sm text-slate-navy dark:text-white">{value ?? '--'}</span>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={value ? 'success' : 'neutral'}>{value ? 'Yes' : 'No'}</Badge>
      <span className="text-sm text-slate-navy dark:text-white">{label}</span>
    </div>
  );
}

const SUB_CAT_LABELS: Record<string, string> = {
  subCatOrphaned: 'Orphaned',
  subCatTrafficked: 'Trafficked',
  subCatChildLabor: 'Child Labor',
  subCatPhysicalAbuse: 'Physical Abuse',
  subCatSexualAbuse: 'Sexual Abuse',
  subCatOsaec: 'OSAEC',
  subCatCicl: 'CICL',
  subCatAtRisk: 'At Risk',
  subCatStreetChild: 'Street Child',
  subCatChildWithHiv: 'Child with HIV',
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'family', label: 'Family & Background' },
  { key: 'admission', label: 'Admission & Referral' },
  { key: 'case', label: 'Case Management' },
];

export function ResidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isCreateMode = !id || id === 'new';
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: resident, isLoading, isError, error } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => api.get<Resident>(`/api/residents/${id}`),
    enabled: !isCreateMode,
  });

  const { data: safehousesData } = useQuery({
    queryKey: ['safehouses'],
    queryFn: () => api.get<{ items: Safehouse[] }>('/api/safehouses?pageSize=100'),
  });

  const { data: riskPrediction } = useQuery({
    queryKey: ['risk-prediction', id],
    queryFn: () => api.get<RiskPrediction>(`/api/predictions/ml/risk-predictions/${id}`),
    enabled: !isCreateMode && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: reintegrationResp } = useQuery({
    queryKey: ['reintegration-factors'],
    queryFn: () => api.get<{ items: ReintegrationFactor[] }>('/api/predictions/ml/reintegration-factors'),
    staleTime: 5 * 60 * 1000,
  });
  const reintegrationFactors = reintegrationResp?.items;

  const safehouseMap = new Map(
    (safehousesData?.items ?? []).map((s) => [s.safehouseId, s.name]),
  );

  const updateMutation = useMutation({
    mutationFn: (data: ResidentFormData) => {
      // Convert empty strings to null for nullable date fields
      const cleaned = { ...data } as Record<string, unknown>;
      for (const key of ['dateColbRegistered', 'dateColbObtained', 'dateCaseStudyPrepared', 'dateClosed'] as const) {
        if (cleaned[key] === '') cleaned[key] = null;
      }
      return api.put(`/api/residents/${id}`, cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setIsEditing(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ResidentFormData) => {
      const cleaned = { ...data } as Record<string, unknown>;
      for (const key of ['dateColbRegistered', 'dateColbObtained', 'dateCaseStudyPrepared', 'dateClosed'] as const) {
        if (cleaned[key] === '') cleaned[key] = null;
      }
      return api.post<Resident>('/api/residents', cleaned);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      navigate(`/admin/residents/${(created as Resident).residentId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/residents/${id}?confirm=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      navigate('/admin/residents');
    },
  });

  // Loading state
  if (!isCreateMode && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (!isCreateMode && isError) {
    return (
      <div>
        <PageHeader title="Resident Detail" />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to load resident: {(error as Error).message}
          </p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Form mode (create or edit)
  if (isEditing) {
    return (
      <div>
        <PageHeader
          title={isCreateMode ? 'New Resident' : `Edit ${resident?.internalCode ?? ''}`}
          subtitle={isCreateMode ? 'Create a new resident record' : `Editing ${resident?.caseControlNo ?? ''}`}
        />
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isCreateMode) {
                navigate(-1);
              } else {
                setIsEditing(false);
              }
            }}
          >
            <ArrowLeft size={16} />
            {isCreateMode ? 'Back to Residents' : 'Cancel Edit'}
          </Button>
        </div>

        {(updateMutation.isError || createMutation.isError) && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {((updateMutation.error ?? createMutation.error) as Error).message}
          </div>
        )}

        <ResidentForm
          defaultValues={isCreateMode ? undefined : resident}
          onSubmit={(data) => {
            if (isCreateMode) {
              createMutation.mutate(data);
            } else {
              updateMutation.mutate(data);
            }
          }}
          onCancel={() => {
            if (isCreateMode) {
              navigate('/admin/residents');
            } else {
              setIsEditing(false);
            }
          }}
          isSubmitting={updateMutation.isPending || createMutation.isPending}
        />
      </div>
    );
  }

  // View mode (resident is guaranteed loaded here)
  const r = resident!;
  const activeSubCats = Object.entries(SUB_CAT_LABELS).filter(
    ([key]) => r[key as keyof Resident] === true,
  );

  const caseLinks = [
    { label: 'Process Recordings', path: `/admin/case/${r.residentId}/recordings`, icon: FileText },
    { label: 'Home Visits', path: `/admin/case/${r.residentId}/visits`, icon: Home },
    { label: 'Education Records', path: `/admin/case/${r.residentId}/education`, icon: GraduationCap },
    { label: 'Health Records', path: `/admin/case/${r.residentId}/health`, icon: HeartPulse },
    { label: 'Intervention Plans', path: `/admin/case/${r.residentId}/interventions`, icon: Target },
    { label: 'Incident Reports', path: `/admin/case/${r.residentId}/incidents`, icon: AlertTriangle },
  ];

  return (
    <div>
      <PageHeader
        title={r.internalCode}
        subtitle={r.caseControlNo}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil size={16} />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        }
      />

      {/* Back Link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-navy/10 dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-golden-honey text-slate-navy dark:text-white'
                : 'text-warm-gray hover:text-slate-navy dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Demographics */}
            <Card>
              <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
                Demographics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Sex" value={r.sex} />
                <InfoRow label="Date of Birth" value={formatDate(r.dateOfBirth)} />
                <InfoRow label="Birth Status" value={r.birthStatus} />
                <InfoRow label="Place of Birth" value={r.placeOfBirth} />
                <InfoRow label="Religion" value={r.religion} />
              </div>
            </Card>

            {/* Case Info */}
            <Card>
              <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
                Case Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Case Control No." value={r.caseControlNo} />
                <InfoRow label="Internal Code" value={r.internalCode} />
                <InfoRow
                  label="Case Status"
                  value={<Badge variant={statusVariant(r.caseStatus)}>{r.caseStatus}</Badge>}
                />
                <InfoRow label="Case Category" value={r.caseCategory} />
                <InfoRow
                  label="Safehouse"
                  value={safehouseMap.get(r.safehouseId) ?? `#${r.safehouseId}`}
                />
              </div>
            </Card>
          </div>

          {/* Sub-categories */}
          {activeSubCats.length > 0 && (
            <Card>
              <h3 className="mb-3 font-heading text-base font-semibold text-slate-navy dark:text-white">
                Sub-Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeSubCats.map(([, label]) => (
                  <Badge key={label} variant="warning">{label}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Risk Levels */}
          <Card>
            <h3 className="mb-3 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Risk Levels
            </h3>
            <div className="flex gap-6">
              <InfoRow
                label="Initial Risk Level"
                value={
                  <Badge variant={riskVariant(r.initialRiskLevel)}>
                    {r.initialRiskLevel}
                  </Badge>
                }
              />
              <InfoRow
                label="Current Risk Level"
                value={
                  <Badge variant={riskVariant(r.currentRiskLevel)}>
                    {r.currentRiskLevel}
                  </Badge>
                }
              />
            </div>
          </Card>

          {/* ML Risk Assessment */}
          {riskPrediction && (
            <Card>
              <h3 className="mb-3 font-heading text-base font-semibold text-slate-navy dark:text-white">
                ML Risk Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoRow
                  label="Predicted Risk"
                  value={
                    <Badge variant={riskVariant(riskPrediction.predictedRiskLevel)}>
                      {riskPrediction.predictedRiskLevel}
                    </Badge>
                  }
                />
                <InfoRow label="Risk Score" value={riskPrediction.predictedRiskScore.toFixed(2)} />
                <InfoRow label="Confidence" value={riskPrediction.confidence} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Top Factors</span>
                  <span className="text-sm text-slate-navy dark:text-white">
                    {riskPrediction.topRiskFactor1}
                  </span>
                  {riskPrediction.topRiskFactor2 && (
                    <span className="text-xs text-warm-gray">{riskPrediction.topRiskFactor2}</span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-warm-gray">Predicted by ML model — updated nightly</p>
            </Card>
          )}

          {/* Reintegration Insights */}
          {reintegrationFactors && reintegrationFactors.length > 0 && (
            <Card>
              <h3 className="mb-3 font-heading text-base font-semibold text-slate-navy dark:text-white">
                Reintegration Insights
              </h3>
              <p className="mb-3 text-xs text-warm-gray">
                Key factors influencing reintegration outcomes across all residents
              </p>
              <div className="space-y-2">
                {reintegrationFactors.slice(0, 5).map((f) => (
                  <div key={f.feature} className="flex items-center justify-between rounded-lg border border-slate-navy/5 px-3 py-2 dark:border-white/5">
                    <div>
                      <span className="text-sm font-medium text-slate-navy dark:text-white">{f.feature}</span>
                      <p className="text-xs text-warm-gray">{f.plainLanguageInterpretation}</p>
                    </div>
                    <Badge variant={f.effectDirection === 'Positive' ? 'success' : f.effectDirection === 'Negative' ? 'danger' : 'neutral'}>
                      {f.effectDirection}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'family' && (
        <div className="space-y-6">
          {/* Disability Info */}
          <Card>
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Disability Information
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BoolBadge value={r.isPwd} label="Person with Disability" />
              {r.isPwd && <InfoRow label="PWD Type" value={r.pwdType} />}
              <BoolBadge value={r.hasSpecialNeeds} label="Has Special Needs" />
              {r.hasSpecialNeeds && (
                <InfoRow label="Special Needs Diagnosis" value={r.specialNeedsDiagnosis} />
              )}
            </div>
          </Card>

          {/* Family Profile */}
          <Card>
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Family Profile
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <BoolBadge value={r.familyIs4ps} label="4Ps Beneficiary" />
              <BoolBadge value={r.familySoloParent} label="Solo Parent" />
              <BoolBadge value={r.familyIndigenous} label="Indigenous" />
              <BoolBadge value={r.familyParentPwd} label="Parent is PWD" />
              <BoolBadge value={r.familyInformalSettler} label="Informal Settler" />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'admission' && (
        <Card>
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            Admission & Referral Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Date of Admission" value={formatDate(r.dateOfAdmission)} />
            <InfoRow label="Age Upon Admission" value={r.ageUponAdmission} />
            <InfoRow label="Present Age" value={r.presentAge} />
            <InfoRow label="Length of Stay" value={r.lengthOfStay} />
            <InfoRow label="Referral Source" value={r.referralSource} />
            <InfoRow label="Referring Agency / Person" value={r.referringAgencyPerson} />
            <InfoRow label="Date COLB Registered" value={formatDate(r.dateColbRegistered)} />
            <InfoRow label="Date COLB Obtained" value={formatDate(r.dateColbObtained)} />
            <InfoRow label="Assigned Social Worker" value={r.assignedSocialWorker} />
            <InfoRow label="Date Enrolled" value={formatDate(r.dateEnrolled)} />
            <InfoRow label="Date Closed" value={formatDate(r.dateClosed)} />
          </div>
        </Card>
      )}

      {activeTab === 'case' && (
        <div className="space-y-6">
          {/* Case Assessment */}
          <Card>
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Case Assessment
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Initial Case Assessment" value={r.initialCaseAssessment} />
              <InfoRow
                label="Date Case Study Prepared"
                value={formatDate(r.dateCaseStudyPrepared)}
              />
            </div>
          </Card>

          {/* Reintegration */}
          <Card>
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Reintegration
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Reintegration Type" value={r.reintegrationType} />
              <InfoRow
                label="Reintegration Status"
                value={
                  r.reintegrationStatus ? (
                    <Badge
                      variant={
                        r.reintegrationStatus === 'Completed'
                          ? 'success'
                          : r.reintegrationStatus === 'Failed'
                            ? 'danger'
                            : 'info'
                      }
                    >
                      {r.reintegrationStatus}
                    </Badge>
                  ) : (
                    '--'
                  )
                }
              />
            </div>
          </Card>

          {/* Quick Links to Case Sub-pages */}
          <div>
            <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
              Case Records
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {caseLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Card key={link.path} onClick={() => navigate(link.path)}>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-sky-blue/20 p-2 text-sky-blue">
                        <Icon size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-navy dark:text-white">
                        {link.label}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Resident"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteMutation.mutate()}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete this resident? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
