export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  EveningMessage: undefined;
  Events: undefined;
  EventDetail: { eventId: string };
  Profile: undefined;
  AdminVenueList: undefined;
  AdminCreateVenue: undefined;
  AdminVenueDetail: { venueId: string };
  AdminConcertList: undefined;
  AdminConcertForm: { concertId?: string };
  AdminAnalytics: undefined;
};

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
}

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mon: { open: '22:00', close: '03:00', closed: true },
  tue: { open: '22:00', close: '03:00', closed: true },
  wed: { open: '22:00', close: '03:00', closed: true },
  thu: { open: '22:00', close: '03:00', closed: false },
  fri: { open: '22:00', close: '03:00', closed: false },
  sat: { open: '22:00', close: '03:00', closed: false },
  sun: { open: '22:00', close: '03:00', closed: true },
};

export interface VenueDoc {
  id: string;
  name: string;
  address: string;
  description: string;
  openingHours: OpeningHours;
  images: string[];
  isActive: boolean;
  ownerEmail: string;
  phone: string;
  inviteStatus: 'pending' | 'active';
  invitesSentAt: Date[];
  lastLoginAt?: Date;
  queueStatus?: string;
  queueEstimate?: number | null;
  eveningMessage?: string;
  views?: number;
  clicks?: number;
}

export interface Venue {
  id: string;
  name: string;
  ownerId: string;
}

export interface QueueEntry {
  id: string;
  name: string;
  partySize: number;
  addedAt: Date;
  status: 'waiting' | 'admitted' | 'removed';
}

export interface EveningMessage {
  id: string;
  venueId: string;
  message: string;
  updatedAt: Date;
  active: boolean;
}

export interface Event {
  id: string;
  venueId: string;
  title: string;
  date: Date;
  description: string;
  imageUrl?: string;
  published: boolean;
}

export type VenueQueueStatus = 'lite' | 'moderat' | 'lang' | 'fullt';

export interface VenueStatus {
  status: VenueQueueStatus;
  estimatedWait: number | null;
  updatedAt: Date;
}

export interface QueueStatusLogEntry {
  id: string;
  venueId: string;
  status: VenueQueueStatus;
  estimatedWait: number | null;
  timestamp: Date;
}

export interface VenueStats {
  weeklyViews: number;
  totalViews: number;
}
