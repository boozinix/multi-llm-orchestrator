// Benefits database - maps card names to their typical benefits
export interface BenefitTemplate {
  title: string;
  value: number;
  frequency: 'monthly' | 'annual' | 'quarterly';
  description?: string;
}

export const BENEFITS_DATABASE: Record<string, BenefitTemplate[]> = {
  // Chase Cards
  'Chase Sapphire Reserve': [
    { title: '$300 Travel Credit', value: 300, frequency: 'annual', description: 'Annual travel credit for flights, hotels, and more' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited lounge access with guest passes' },
    { title: '$100 Global Entry/TSA PreCheck Credit', value: 100, frequency: 'annual', description: 'Statement credit for application fee' },
    { title: 'DoorDash DashPass', value: 96, frequency: 'annual', description: 'Complimentary DashPass membership' },
    { title: 'Lyft Pink', value: 199, frequency: 'annual', description: 'Complimentary Lyft Pink membership' },
  ],
  'Chase Sapphire Preferred': [
    { title: '$50 Annual Hotel Credit', value: 50, frequency: 'annual', description: 'Statement credit for Chase Travel purchases' },
    { title: 'DoorDash $5 Monthly Credit', value: 5, frequency: 'monthly', description: 'After DashPass activation' },
  ],
  'Chase Freedom Unlimited': [
    { title: '5% Gas Station Bonus', value: 0, frequency: 'quarterly', description: 'First $6,000 in combined quarterly purchases' },
  ],
  'Chase Freedom Flex': [
    { title: '5% Category Bonus', value: 0, frequency: 'quarterly', description: 'Up to $1,500 in rotating categories' },
  ],
  'Chase Ink Business Preferred': [
    { title: '$100 Quarterly Online Advertising Credit', value: 100, frequency: 'quarterly', description: 'For Google, Facebook, and more' },
  ],

  // American Express Cards
  'American Express Platinum': [
    { title: '$200 Airline Fee Credit', value: 200, frequency: 'annual', description: 'For baggage fees, seat selection, etc.' },
    { title: '$200 Hotel Credit', value: 200, frequency: 'annual', description: 'Prepaid Fine Hotels + Resorts or The Hotel Collection' },
    { title: '$15 Uber Cash', value: 15, frequency: 'monthly', description: '$35 in December ($15 other months)' },
    { title: '$20 Digital Entertainment Credit', value: 20, frequency: 'monthly', description: 'For streaming services' },
    { title: '$100 Saks Fifth Avenue Credit', value: 100, frequency: 'annual', description: '$50 per 6-month period' },
    { title: '$189 CLEAR Credit', value: 189, frequency: 'annual', description: 'Statement credit for CLEAR Plus membership' },
    { title: '$300 Equinox Credit', value: 300, frequency: 'annual', description: 'For Equinox+ Digital or Equinox club memberships' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited lounge access' },
    { title: 'Centurion Lounge Access', value: 0, frequency: 'annual', description: 'Complimentary access to Amex lounges' },
    { title: 'Global Entry/TSA PreCheck Credit', value: 100, frequency: 'annual', description: 'Statement credit every 4 years' },
  ],
  'American Express Gold': [
    { title: '$10 Uber Cash', value: 10, frequency: 'monthly', description: '$35 in December ($10 other months)' },
    { title: '$10 Grubhub+ Credit', value: 10, frequency: 'monthly', description: 'After enrollment' },
    { title: '$120 Dining Credit', value: 120, frequency: 'annual', description: 'At select restaurants' },
  ],
  'American Express Green': [
    { title: '$100 LoungeBuddy Credit', value: 100, frequency: 'annual', description: 'For lounge access passes' },
    { title: 'CLEAR Credit', value: 189, frequency: 'annual', description: 'Up to $189 statement credit' },
  ],
  'American Express Delta SkyMiles Reserve': [
    { title: '$250 Delta Purchase Credit', value: 250, frequency: 'annual', description: 'For Delta purchases' },
    { title: 'Delta Sky Club Access', value: 0, frequency: 'annual', description: 'Complimentary access with boarding pass' },
    { title: 'Companion Certificate', value: 0, frequency: 'annual', description: 'Annual companion certificate' },
  ],
  'American Express Hilton Honors Aspire': [
    { title: '$250 Hilton Resort Credit', value: 250, frequency: 'annual', description: 'At Hilton resorts' },
    { title: '$250 Airline Fee Credit', value: 250, frequency: 'annual', description: 'For incidental fees' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited access with guests' },
    { title: 'Free Weekend Night', value: 0, frequency: 'annual', description: 'After card anniversary' },
    { title: 'Hilton Diamond Status', value: 0, frequency: 'annual', description: 'Complimentary elite status' },
  ],

  // Capital One Cards
  'Capital One Venture X': [
    { title: '$300 Travel Credit', value: 300, frequency: 'annual', description: 'For Capital One Travel bookings' },
    { title: '$100 TSA PreCheck/Global Entry Credit', value: 100, frequency: 'annual', description: 'Every 4 years' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited access with guests' },
    { title: 'Anniversary Bonus', value: 10000, frequency: 'annual', description: '10,000 bonus miles each year' },
    { title: 'Hertz President\'s Circle Status', value: 0, frequency: 'annual', description: 'Complimentary elite status' },
  ],
  'Capital One Venture': [
    { title: 'TSA PreCheck Credit', value: 100, frequency: 'annual', description: 'Every 4 years' },
  ],
  'Capital One Savor': [
    { title: '$100 Vivid Seats Credit', value: 100, frequency: 'annual', description: 'For concert and event tickets' },
  ],

  // Citi Cards
  'Citi Premier': [
    { title: '$100 Hotel Credit', value: 100, frequency: 'annual', description: 'At select properties' },
  ],
  'Citi Prestige': [
    { title: '$250 Air Travel Credit', value: 250, frequency: 'annual', description: 'For airline purchases' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited access with guests' },
    { title: '$100 Global Entry Credit', value: 100, frequency: 'annual', description: 'Every 4 years' },
    { title: '4th Night Free', value: 0, frequency: 'annual', description: 'On hotel stays through Citi' },
  ],

  // Bank of America Cards
  'Bank of America Premium Rewards': [
    { title: '$100 Airline Incidental Credit', value: 100, frequency: 'annual', description: 'For one airline per year' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: '4 free visits per year' },
  ],

  // US Bank Cards
  'US Bank Altitude Reserve': [
    { title: '$325 Travel Credit', value: 325, frequency: 'annual', description: 'Automatic statement credit for travel' },
    { title: 'Priority Pass Lounge Access', value: 0, frequency: 'annual', description: 'Unlimited access with guests' },
    { title: '$100 TSA PreCheck/Global Entry Credit', value: 100, frequency: 'annual', description: 'Every 4 years' },
  ],

  // Barclays Cards
  'Barclays Arrival Premier': [
    { title: '$100 Global Entry Credit', value: 100, frequency: 'annual', description: 'Statement credit' },
  ],
  'Barclays AAdvantage Aviator Red': [
    { title: 'Free Checked Bag', value: 0, frequency: 'annual', description: 'On American Airlines flights' },
    { title: 'Priority Boarding', value: 0, frequency: 'annual', description: 'On American Airlines flights' },
  ],
};

// Get benefits for a specific card
export const getBenefitsForCard = (cardName: string): BenefitTemplate[] => {
  return BENEFITS_DATABASE[cardName] || [];
};
