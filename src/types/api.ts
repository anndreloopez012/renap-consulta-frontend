export interface UserRole {
  id: number;
  name: string;
  type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  company?: string;
  role?: UserRole;
  createdAt?: string;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface InfoRecord {
  id: number;
  documentId: string;
  CUI: string;
  PRIMER_NOMBRE: string | null;
  SEGUNDO_NOMBRE: string | null;
  TERCER_NOMBRE: string | null;
  PRIMER_APELLIDO: string | null;
  SEGUNDO_APELLIDO: string | null;
  FECHA_NACIMIENTO: string | null;
  CORREO_ELECTRONICO: string | null;
  TELEFONO: string | null;
  PAIS_RESIDENCIA: string | null;
  DEPTO_RESIDENCIA: string | null;
  MUNIC_RESIDENCIA: string | null;
  DIRECCION: string | null;
  WS_MIDES: string | null;
  WS_MAGA: string | null;
  WS_MSPAS: string | null;
  WS_MINECO: string | null;
  relevance?: number;
}

export interface SearchResponse {
  data: InfoRecord[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      count: number;
    };
  };
}

export interface InfoLog {
  id: number;
  searchedAt: string;
  userLabel: string;
  searchFilters: Record<string, string> | null;
  requestPath: string;
  requestMethod: string;
}

export interface LogsResponse {
  data: InfoLog[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
