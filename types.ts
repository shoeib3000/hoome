
export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  phone: string;
  avatar?: string;
  joinDate: number;
  role: 'user' | 'agent' | 'admin';
  agentProfile?: AgentProfile;
  activities: Activity[];
  agencyName?: string;
  licenseNumber?: string;
  trustLevel?: string;
  specialty?: string[];
}

export interface AgentProfile {
  licenseNumber: string;
  agencyName: string;
  specialty: string[]; // e.g., ['Luxury', 'Commercial', 'Residential']
  rating: number;
  totalDeals: number;
  isVerified: boolean;
  trustLevel: 'silver' | 'gold' | 'diamond';
  bio?: string;
}

export interface Activity {
  id: string;
  type: 'LOGIN' | 'AD_POSTED' | 'CHAT_STARTED' | 'PROFILE_UPDATED' | 'AD_PROMOTED' | 'PAYMENT_SUCCESS' | 'SMS_SENT' | 'ROLE_CHANGED' | 'AGENT_VERIFIED' | 'TICKET_CREATED' | 'PACKAGE_PURCHASED';
  timestamp: number;
  details: string;
}

export type PromotionTier = string;

export interface PromotionPlan {
  id: PromotionTier;
  title: string;
  price: string;
  durationDays: number;
  contactVisible: boolean;
  priorityLevel: number;
  features: string[];
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  freeLimitCount?: number; // e.g., 1 free ad
  freeLimitDays?: number;  // e.g., every 20 days
  freeAdLimitDays?: number; // alias for compatibility
  maxFreeAdsPerPeriod?: number; // alias for compatibility
  paidAdPrice?: number;    // cost per extra ad in Tomans
}

export interface ListingPackage {
  id: string;
  title: string;
  adCount: number;
  price: number;
  durationDays: number;
  description: string;
  badge?: string;
  featuredBonusCount?: number;
  ladderBonusCount?: number;
  isActive: boolean;
  createdAt?: string | number;
}

export interface UserPackage {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  packageId: string;
  packageTitle: string;
  totalAds: number;
  adQuota?: number;
  remainingAds: number;
  pricePaid?: number;
  ladderBonusRemaining?: number;
  featuredBonusRemaining?: number;
  purchasedAt: number;
  activatedAt?: number;
  approvedAt?: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'pending' | 'rejected';
  receiptId?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone?: string;
  subject: string;
  department: 'general' | 'financial' | 'technical' | 'listings' | 'agent' | 'support' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'answered' | 'waiting' | 'closed';
  createdAt: number;
  updatedAt: number;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  text: string;
  timestamp: number;
  attachmentUrl?: string;
}

export interface Province {
  id: string;
  name: string;
  cities: string[];
}

export interface ZarinPalConfig {
  merchantId: string;
  isSandbox: boolean;
  isEnabled: boolean;
}

export interface CardPaymentConfig {
  isEnabled: boolean;
  bankName: string;
  cardNumber: string;
  accountHolder: string;
  iban: string;
  description?: string;
}

export interface PaymentReceipt {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  listingId?: string;
  listingTitle?: string;
  planId?: PromotionTier;
  planTitle?: string;
  packageId?: string;
  packageTitle?: string;
  type?: 'promotion' | 'package';
  amount: string;
  paymentMethod: 'card_to_card' | 'zarinpal';
  receiptImageUrl?: string;
  trackingCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  reviewedAt?: number;
}

export interface MeliPayamakConfig {
  username: string;
  password?: string;
  senderNumber: string;
  isEnabled: boolean;
  events?: {
    otpLogin?: boolean;
    adStatus?: boolean;
    newMessage?: boolean;
    purchaseStatus?: boolean;
    loginAlert?: boolean;
    welcomeMessage?: boolean;
    passwordRecovery?: boolean;
  }
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  ownerId: string;
  seekerId: string;
  messages: Message[];
  lastUpdate: number;
}

export type ExpiryAction = 'archive' | 'delete';

export interface ExpirationSettings {
  defaultLifetimeDays: number;
  expiryAction: ExpiryAction;
  autoCleanupEnabled: boolean;
  autoApproveListings?: boolean;
}

export interface PropertyListing {
  id?: string;
  title: string;
  type: 'rent' | 'sale';
  category: string;
  province: string;
  city: string;
  neighborhood: string;
  size: number | '';
  bedrooms: number | '';
  bathrooms: number | '';
  yearBuilt: number | '';
  builtYear?: number | '';
  floor?: string | number;
  features?: string[];
  address?: string;
  contactName?: string;
  deposit?: number | '';
  rent?: number | '';
  keyFeatures: string;
  description: string;
  price: number | '';
  images: string[];
  isLiked?: boolean;
  ownerId?: string;
  ownerRole?: 'user' | 'agent' | 'admin';
  isAgentListing?: boolean;
  agencyName?: string;
  contactMethod?: 'all' | 'chat_only' | 'phone_only';
  showPhoneNumber?: boolean;
  contact?: { phone?: string; name?: string };
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'archived';
  rejectionReason?: string;
  promotion: PromotionTier;
  contactPhone?: string;
  createdAt: number;
  expiryDate: number;
  lastPromotedAt?: number;
}

export interface AdSlot {
  id: string;
  position: 'hero' | 'in-feed' | 'sidebar' | 'footer' | 'sticky-footer';
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  priority: number;
}

export interface BannerSliderConfig {
  autoSlideEnabled: boolean;
  autoSlideIntervalSeconds: number;
}

export interface TrustBadge {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

export type WizardStep = 'details' | 'media_contact' | 'location' | 'photos' | 'account' | 'review';

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
  systemInstruction: string;
}

export interface PasswordPolicyConfig {
  minLength: number;
  requireNumbers: boolean;
  requireLetters: boolean;
  requireUppercase: boolean;
  requireSpecialChars: boolean;
  maxFailedAttempts?: number;
}

export interface SiteBrandingConfig {
  siteName: string;
  siteSubtitle?: string;
  logoUrl?: string;
  logoIcon?: string;
  autoRedirectToPwa?: boolean;
  sessionTimeoutMinutes?: number;
  activeUsersCountBase?: number;
  passwordPolicy?: PasswordPolicyConfig;
}

