export interface IResponse<T = any> {
  success: boolean;
  data: T;
  code: number;
  message?: {
    error: { message: string };
  };
}
