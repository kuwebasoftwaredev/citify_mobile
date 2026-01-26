export interface IAuth {
  _id: string;
  branch: string;
  cart: any[];
  company: string;
  coordinates: { lat: string | number; lng: string | number };
  email: string;
  isBlock: boolean;
  phoneNumber: string;
  profile_picture: {
    url: string;
    format: string;
    publicId: string;
  };
  role: string;
  shop?: {
    businessName: string;
    coordinates: { lat: string | number; lng: string | number };
    logo: string;
    _id: string;
  };
}

export interface IAuthState {
  account: IAuth;
  error: any;
}
