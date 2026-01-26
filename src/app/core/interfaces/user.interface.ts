export interface IUserData {
  address1: string;
  address2: string;
  branch: string;
  cart: object[];
  company: string;
  coordinates: { lat: string; lng: string };
  email: string;
  fullname: string;
  isblock: boolean;
  phoneNumber: string;
  profile_picture: { url: string; format: string };
  role: string;
  _id: string;
  shop?: {
    _id: string;
    businessName: string;
    logo: string;
    documents: {
      bir: string;
      businessPermit: string;
    };
    address1: string;
    address2: string;
    coordinates: {
      lat: string;
      lng: string;
    };
    createdAt: string;
    updatedAt: string;
    phoneNumber: string;
  };
}
