/**
 * BookMyShot — Premium Mock Data
 * Used as fallback when API is unavailable
 */

export const mockCreators = [
  { _id: '1', user: { name: 'Arjun Kapoor Studios', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' }, specialty: 'Wedding Photography', city: 'Mumbai', rating: 4.9, reviewCount: 127, startingPrice: 45000, featured: true, verified: true, portfolio: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=600', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600', 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600'], available: true, category: 'wedding' },
  { _id: '2', user: { name: 'Priya Sharma Films', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' }, specialty: 'Cinematography', city: 'Delhi', rating: 4.8, reviewCount: 89, startingPrice: 65000, featured: true, verified: true, portfolio: ['https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=600', 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600'], available: true, category: 'cinematography' },
  { _id: '3', user: { name: 'Vikram Photography', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' }, specialty: 'Pre-Wedding', city: 'Jaipur', rating: 4.7, reviewCount: 203, startingPrice: 35000, featured: false, verified: true, portfolio: ['https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600', 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=600'], available: true, category: 'pre-wedding' },
  { _id: '4', user: { name: 'Riya Makeover Studio', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200' }, specialty: 'Bridal Makeup', city: 'Bangalore', rating: 4.9, reviewCount: 156, startingPrice: 25000, featured: true, verified: true, portfolio: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600'], available: false, category: 'makeup' },
  { _id: '5', user: { name: 'Rajesh Drone Shots', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' }, specialty: 'Drone Photography', city: 'Goa', rating: 4.6, reviewCount: 67, startingPrice: 20000, featured: false, verified: true, portfolio: ['https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=600'], available: true, category: 'drone' },
  { _id: '6', user: { name: 'Neha Wedding Films', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }, specialty: 'Wedding Cinematography', city: 'Hyderabad', rating: 4.8, reviewCount: 94, startingPrice: 55000, featured: false, verified: true, portfolio: ['https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600'], available: true, category: 'cinematography' },
  { _id: '7', user: { name: 'Amit Mehendi Art', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' }, specialty: 'Mehendi Design', city: 'Pune', rating: 4.5, reviewCount: 45, startingPrice: 15000, featured: false, verified: false, portfolio: ['https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?w=600'], available: true, category: 'mehendi' },
  { _id: '8', user: { name: 'Studio Luxe', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200' }, specialty: 'Luxury Weddings', city: 'Mumbai', rating: 5.0, reviewCount: 312, startingPrice: 150000, featured: true, verified: true, portfolio: ['https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600'], available: true, category: 'wedding' },
];

export const mockCategories = [
  { id: 'all', label: 'All', icon: '✨', count: 850 },
  { id: 'wedding', label: 'Wedding', icon: '💒', count: 340 },
  { id: 'pre-wedding', label: 'Pre-Wedding', icon: '💑', count: 220 },
  { id: 'cinematography', label: 'Cinema', icon: '🎬', count: 180 },
  { id: 'makeup', label: 'Makeup', icon: '💄', count: 150 },
  { id: 'mehendi', label: 'Mehendi', icon: '🌿', count: 90 },
  { id: 'drone', label: 'Drone', icon: '🚁', count: 45 },
  { id: 'decoration', label: 'Decor', icon: '🎊', count: 60 },
];

export const mockCities = [
  { id: 'mumbai', name: 'Mumbai', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=300', count: 120 },
  { id: 'delhi', name: 'Delhi', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=300', count: 95 },
  { id: 'bangalore', name: 'Bangalore', image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=300', count: 78 },
  { id: 'jaipur', name: 'Jaipur', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=300', count: 65 },
  { id: 'hyderabad', name: 'Hyderabad', image: 'https://images.unsplash.com/photo-1572435555646-7ad9a149ad91?w=300', count: 52 },
  { id: 'goa', name: 'Goa', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=300', count: 38 },
];

export const mockBookings = [
  { _id: 'b1', creatorName: 'Arjun Kapoor Studios', eventType: 'Wedding', eventDate: '2026-07-15', status: 'confirmed', amount: 85000, location: 'Mumbai', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { _id: 'b2', creatorName: 'Priya Sharma Films', eventType: 'Pre-Wedding Shoot', eventDate: '2026-06-28', status: 'upcoming', amount: 45000, location: 'Jaipur', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { _id: 'b3', creatorName: 'Studio Luxe', eventType: 'Engagement', eventDate: '2026-05-20', status: 'completed', amount: 65000, location: 'Delhi', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100' },
];

export const trendingSearches = ['Pre-wedding shoot in Goa', 'Wedding photographer Mumbai', 'Drone cinematography', 'Bridal makeup artist', 'Candid photography Delhi'];

export const promotionalBanners = [
  { id: '1', title: '₹5000 OFF', subtitle: 'On your first booking', color: '#D4AF37' },
  { id: '2', title: 'Premium Creators', subtitle: 'Verified & trusted', color: '#8B7025' },
  { id: '3', title: 'Refer & Earn', subtitle: 'Get ₹2000 per referral', color: '#FF8C42' },
];
