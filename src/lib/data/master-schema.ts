/** Locked master + audit select lists — never invent units or extra tables. */
export const MATRIX_SELECT = "id,code,name,description,is_active";
export const METHOD_SELECT = "id,code,name,standard_ref,description,is_active";
export const PARAMETER_SELECT = "id,code,name,unit,method_id,matrix_id,loq,baku_mutu,is_active";
/** Admin SELECT only. Never INSERT/UPDATE/DELETE from the client. */
export const AUDIT_SELECT = "id,occurred_at,actor_id,action,table_name,row_id,old_data,new_data";

export const MASTER_KEYS = ["matrices", "methods", "parameters"] as const;
export type MasterTableKey = (typeof MASTER_KEYS)[number];
