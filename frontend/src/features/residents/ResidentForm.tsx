import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Resident, Safehouse } from '../../types/models';

const selectClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

const checkboxClass =
  'h-4 w-4 rounded border-slate-navy/20 text-golden-honey focus:ring-golden-honey/40';

const residentSchema = z.object({
  caseControlNo: z.string().min(1, 'Required'),
  internalCode: z.string().min(1, 'Required'),
  safehouseId: z.number().min(1, 'Required'),
  caseStatus: z.string().min(1, 'Required'),
  sex: z.string().min(1, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  birthStatus: z.string().optional().default(''),
  placeOfBirth: z.string().optional().default(''),
  religion: z.string().nullable().optional(),
  caseCategory: z.string().min(1, 'Required'),
  subCatOrphaned: z.boolean().default(false),
  subCatTrafficked: z.boolean().default(false),
  subCatChildLabor: z.boolean().default(false),
  subCatPhysicalAbuse: z.boolean().default(false),
  subCatSexualAbuse: z.boolean().default(false),
  subCatOsaec: z.boolean().default(false),
  subCatCicl: z.boolean().default(false),
  subCatAtRisk: z.boolean().default(false),
  subCatStreetChild: z.boolean().default(false),
  subCatChildWithHiv: z.boolean().default(false),
  isPwd: z.boolean().default(false),
  pwdType: z.string().nullable().optional(),
  hasSpecialNeeds: z.boolean().default(false),
  specialNeedsDiagnosis: z.string().nullable().optional(),
  familyIs4ps: z.boolean().default(false),
  familySoloParent: z.boolean().default(false),
  familyIndigenous: z.boolean().default(false),
  familyParentPwd: z.boolean().default(false),
  familyInformalSettler: z.boolean().default(false),
  dateOfAdmission: z.string().min(1, 'Required'),
  ageUponAdmission: z.string().optional().default(''),
  presentAge: z.string().optional().default(''),
  lengthOfStay: z.string().optional().default(''),
  referralSource: z.string().min(1, 'Required'),
  referringAgencyPerson: z.string().nullable().optional(),
  dateColbRegistered: z.string().nullable().optional(),
  dateColbObtained: z.string().nullable().optional(),
  assignedSocialWorker: z.string().min(1, 'Required'),
  initialCaseAssessment: z.string().nullable().optional(),
  dateCaseStudyPrepared: z.string().nullable().optional(),
  reintegrationType: z.string().nullable().optional(),
  reintegrationStatus: z.string().nullable().optional(),
  initialRiskLevel: z.string().min(1, 'Required'),
  currentRiskLevel: z.string().min(1, 'Required'),
  dateEnrolled: z.string().optional().default(''),
  dateClosed: z.string().nullable().optional(),
  notesRestricted: z.string().nullable().optional(),
});

export type ResidentFormData = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  defaultValues?: Partial<Resident>;
  onSubmit: (data: ResidentFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function SelectField({
  label,
  error,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-navy dark:text-white">
        {label}
      </label>
      <select className={selectClass} {...rest}>
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
      <input
        type="checkbox"
        className={checkboxClass}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-3 mt-2 font-heading text-base font-semibold text-slate-navy dark:text-white">
      {title}
    </h3>
  );
}

export function ResidentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ResidentFormProps) {
  const { data: safehouses } = useQuery({
    queryKey: ['safehouses'],
    queryFn: () => api.get<Safehouse[]>('/api/safehouses'),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResidentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(residentSchema) as any,
    defaultValues: {
      caseControlNo: defaultValues?.caseControlNo ?? '',
      internalCode: defaultValues?.internalCode ?? '',
      safehouseId: defaultValues?.safehouseId ?? 0,
      caseStatus: defaultValues?.caseStatus ?? 'Active',
      sex: defaultValues?.sex ?? '',
      dateOfBirth: defaultValues?.dateOfBirth?.split('T')[0] ?? '',
      birthStatus: defaultValues?.birthStatus ?? '',
      placeOfBirth: defaultValues?.placeOfBirth ?? '',
      religion: defaultValues?.religion ?? '',
      caseCategory: defaultValues?.caseCategory ?? '',
      subCatOrphaned: defaultValues?.subCatOrphaned ?? false,
      subCatTrafficked: defaultValues?.subCatTrafficked ?? false,
      subCatChildLabor: defaultValues?.subCatChildLabor ?? false,
      subCatPhysicalAbuse: defaultValues?.subCatPhysicalAbuse ?? false,
      subCatSexualAbuse: defaultValues?.subCatSexualAbuse ?? false,
      subCatOsaec: defaultValues?.subCatOsaec ?? false,
      subCatCicl: defaultValues?.subCatCicl ?? false,
      subCatAtRisk: defaultValues?.subCatAtRisk ?? false,
      subCatStreetChild: defaultValues?.subCatStreetChild ?? false,
      subCatChildWithHiv: defaultValues?.subCatChildWithHiv ?? false,
      isPwd: defaultValues?.isPwd ?? false,
      pwdType: defaultValues?.pwdType ?? '',
      hasSpecialNeeds: defaultValues?.hasSpecialNeeds ?? false,
      specialNeedsDiagnosis: defaultValues?.specialNeedsDiagnosis ?? '',
      familyIs4ps: defaultValues?.familyIs4ps ?? false,
      familySoloParent: defaultValues?.familySoloParent ?? false,
      familyIndigenous: defaultValues?.familyIndigenous ?? false,
      familyParentPwd: defaultValues?.familyParentPwd ?? false,
      familyInformalSettler: defaultValues?.familyInformalSettler ?? false,
      dateOfAdmission: defaultValues?.dateOfAdmission?.split('T')[0] ?? '',
      ageUponAdmission: defaultValues?.ageUponAdmission ?? '',
      presentAge: defaultValues?.presentAge ?? '',
      lengthOfStay: defaultValues?.lengthOfStay ?? '',
      referralSource: defaultValues?.referralSource ?? '',
      referringAgencyPerson: defaultValues?.referringAgencyPerson ?? '',
      dateColbRegistered: defaultValues?.dateColbRegistered?.split('T')[0] ?? '',
      dateColbObtained: defaultValues?.dateColbObtained?.split('T')[0] ?? '',
      assignedSocialWorker: defaultValues?.assignedSocialWorker ?? '',
      initialCaseAssessment: defaultValues?.initialCaseAssessment ?? '',
      dateCaseStudyPrepared: defaultValues?.dateCaseStudyPrepared?.split('T')[0] ?? '',
      reintegrationType: defaultValues?.reintegrationType ?? '',
      reintegrationStatus: defaultValues?.reintegrationStatus ?? '',
      initialRiskLevel: defaultValues?.initialRiskLevel ?? '',
      currentRiskLevel: defaultValues?.currentRiskLevel ?? '',
      dateEnrolled: defaultValues?.dateEnrolled?.split('T')[0] ?? '',
      dateClosed: defaultValues?.dateClosed?.split('T')[0] ?? '',
      notesRestricted: defaultValues?.notesRestricted ?? '',
    },
  });

  const isPwd = watch('isPwd');
  const hasSpecialNeeds = watch('hasSpecialNeeds');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Demographics */}
      <Card>
        <SectionHeader title="Demographics" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Case Control No."
            error={errors.caseControlNo?.message}
            {...register('caseControlNo')}
          />
          <Input
            label="Internal Code"
            error={errors.internalCode?.message}
            {...register('internalCode')}
          />
          <SelectField
            label="Safehouse"
            error={errors.safehouseId?.message}
            value={watch('safehouseId')}
            onChange={(e) => setValue('safehouseId', Number(e.target.value))}
          >
            <option value={0}>Select safehouse...</option>
            {(safehouses ?? []).map((s) => (
              <option key={s.safehouseId} value={s.safehouseId}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Sex"
            error={errors.sex?.message}
            {...register('sex')}
          >
            <option value="">Select...</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </SelectField>
          <Input
            label="Date of Birth"
            type="date"
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <Input
            label="Birth Status"
            {...register('birthStatus')}
          />
          <Input
            label="Place of Birth"
            {...register('placeOfBirth')}
          />
          <Input
            label="Religion"
            {...register('religion')}
          />
        </div>
      </Card>

      {/* Case Info */}
      <Card>
        <SectionHeader title="Case Information" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Case Status"
            error={errors.caseStatus?.message}
            {...register('caseStatus')}
          >
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
            <option value="Transferred">Transferred</option>
          </SelectField>
          <SelectField
            label="Case Category"
            error={errors.caseCategory?.message}
            {...register('caseCategory')}
          >
            <option value="">Select...</option>
            <option value="Neglected">Neglected</option>
            <option value="Surrendered">Surrendered</option>
            <option value="Abandoned">Abandoned</option>
            <option value="CICL">CICL</option>
            <option value="Trafficked">Trafficked</option>
          </SelectField>
          <SelectField
            label="Initial Risk Level"
            error={errors.initialRiskLevel?.message}
            {...register('initialRiskLevel')}
          >
            <option value="">Select...</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </SelectField>
          <SelectField
            label="Current Risk Level"
            error={errors.currentRiskLevel?.message}
            {...register('currentRiskLevel')}
          >
            <option value="">Select...</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </SelectField>
        </div>

        <SectionHeader title="Sub-Categories" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <CheckboxField
            label="Orphaned"
            checked={watch('subCatOrphaned')}
            onChange={(val) => setValue('subCatOrphaned', val)}
          />
          <CheckboxField
            label="Trafficked"
            checked={watch('subCatTrafficked')}
            onChange={(val) => setValue('subCatTrafficked', val)}
          />
          <CheckboxField
            label="Child Labor"
            checked={watch('subCatChildLabor')}
            onChange={(val) => setValue('subCatChildLabor', val)}
          />
          <CheckboxField
            label="Physical Abuse"
            checked={watch('subCatPhysicalAbuse')}
            onChange={(val) => setValue('subCatPhysicalAbuse', val)}
          />
          <CheckboxField
            label="Sexual Abuse"
            checked={watch('subCatSexualAbuse')}
            onChange={(val) => setValue('subCatSexualAbuse', val)}
          />
          <CheckboxField
            label="OSAEC"
            checked={watch('subCatOsaec')}
            onChange={(val) => setValue('subCatOsaec', val)}
          />
          <CheckboxField
            label="CICL"
            checked={watch('subCatCicl')}
            onChange={(val) => setValue('subCatCicl', val)}
          />
          <CheckboxField
            label="At Risk"
            checked={watch('subCatAtRisk')}
            onChange={(val) => setValue('subCatAtRisk', val)}
          />
          <CheckboxField
            label="Street Child"
            checked={watch('subCatStreetChild')}
            onChange={(val) => setValue('subCatStreetChild', val)}
          />
          <CheckboxField
            label="Child with HIV"
            checked={watch('subCatChildWithHiv')}
            onChange={(val) => setValue('subCatChildWithHiv', val)}
          />
        </div>
      </Card>

      {/* Disability & Special Needs */}
      <Card>
        <SectionHeader title="Disability & Special Needs" />
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <CheckboxField
            label="Person with Disability"
            checked={isPwd}
            onChange={(val) => setValue('isPwd', val)}
          />
          <CheckboxField
            label="Has Special Needs"
            checked={hasSpecialNeeds}
            onChange={(val) => setValue('hasSpecialNeeds', val)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isPwd && (
            <Input
              label="PWD Type"
              {...register('pwdType')}
            />
          )}
          {hasSpecialNeeds && (
            <Input
              label="Special Needs Diagnosis"
              {...register('specialNeedsDiagnosis')}
            />
          )}
        </div>
      </Card>

      {/* Family Profile */}
      <Card>
        <SectionHeader title="Family Profile" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <CheckboxField
            label="4Ps Beneficiary"
            checked={watch('familyIs4ps')}
            onChange={(val) => setValue('familyIs4ps', val)}
          />
          <CheckboxField
            label="Solo Parent"
            checked={watch('familySoloParent')}
            onChange={(val) => setValue('familySoloParent', val)}
          />
          <CheckboxField
            label="Indigenous"
            checked={watch('familyIndigenous')}
            onChange={(val) => setValue('familyIndigenous', val)}
          />
          <CheckboxField
            label="Parent is PWD"
            checked={watch('familyParentPwd')}
            onChange={(val) => setValue('familyParentPwd', val)}
          />
          <CheckboxField
            label="Informal Settler"
            checked={watch('familyInformalSettler')}
            onChange={(val) => setValue('familyInformalSettler', val)}
          />
        </div>
      </Card>

      {/* Admission & Referral */}
      <Card>
        <SectionHeader title="Admission & Referral" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date of Admission"
            type="date"
            error={errors.dateOfAdmission?.message}
            {...register('dateOfAdmission')}
          />
          <Input
            label="Age Upon Admission"
            {...register('ageUponAdmission')}
          />
          <Input
            label="Present Age"
            {...register('presentAge')}
          />
          <Input
            label="Length of Stay"
            {...register('lengthOfStay')}
          />
          <SelectField
            label="Referral Source"
            error={errors.referralSource?.message}
            {...register('referralSource')}
          >
            <option value="">Select...</option>
            <option value="DSWD">DSWD</option>
            <option value="LGU">LGU</option>
            <option value="Police">Police</option>
            <option value="NGO">NGO</option>
            <option value="Self-Referral">Self-Referral</option>
            <option value="Walk-In">Walk-In</option>
            <option value="Court">Court</option>
            <option value="Other">Other</option>
          </SelectField>
          <Input
            label="Referring Agency / Person"
            {...register('referringAgencyPerson')}
          />
          <Input
            label="Date COLB Registered"
            type="date"
            {...register('dateColbRegistered')}
          />
          <Input
            label="Date COLB Obtained"
            type="date"
            {...register('dateColbObtained')}
          />
          <Input
            label="Assigned Social Worker"
            error={errors.assignedSocialWorker?.message}
            {...register('assignedSocialWorker')}
          />
        </div>
      </Card>

      {/* Case Management */}
      <Card>
        <SectionHeader title="Case Management" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Initial Case Assessment"
            {...register('initialCaseAssessment')}
          />
          <Input
            label="Date Case Study Prepared"
            type="date"
            {...register('dateCaseStudyPrepared')}
          />
          <SelectField
            label="Reintegration Type"
            {...register('reintegrationType')}
          >
            <option value="">None</option>
            <option value="Family">Family</option>
            <option value="Foster Care">Foster Care</option>
            <option value="Adoption">Adoption</option>
            <option value="Independent Living">Independent Living</option>
          </SelectField>
          <SelectField
            label="Reintegration Status"
            {...register('reintegrationStatus')}
          >
            <option value="">None</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </SelectField>
          <Input
            label="Date Enrolled"
            type="date"
            {...register('dateEnrolled')}
          />
          <Input
            label="Date Closed"
            type="date"
            {...register('dateClosed')}
          />
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader title="Notes" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">
            Restricted Notes
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
            rows={3}
            {...register('notesRestricted')}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save Resident
        </Button>
      </div>
    </form>
  );
}
