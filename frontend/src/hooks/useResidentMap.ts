import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Resident } from '../types/models';
import type { PagedResult } from '../types/api';

interface ResidentIdentifier {
  internalCode: string;
  caseControlNo: string;
}

export function useResidentMap() {
  const { data } = useQuery({
    queryKey: ['residents-all'],
    queryFn: () => api.get<PagedResult<Resident>>('/api/residents?page=1&pageSize=500'),
    staleTime: 5 * 60 * 1000,
  });

  const residentMap = new Map<number, ResidentIdentifier>(
    (data?.items ?? []).map((resident) => [resident.residentId, {
      internalCode: resident.internalCode,
      caseControlNo: resident.caseControlNo,
    }]),
  );

  return { residentMap };
}
