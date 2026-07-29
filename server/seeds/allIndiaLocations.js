/**
 * All India States & Districts seed data
 * Run: node server/seeds/allIndiaLocations.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ServiceLocation = require('../models/ServiceLocation');

const LOCATIONS = [
  // ═══ JAMMU & KASHMIR ═══
  ...['Anantnag','Bandipora','Baramulla','Budgam','Doda','Ganderbal','Jammu','Kathua','Kishtwar','Kulgam','Kupwara','Poonch','Pulwama','Rajouri','Ramban','Reasi','Samba','Shopian','Srinagar','Udhampur','Surankote','Mendhar','Haveli','Sunderbani','Nowshera','Akhnoor','Katra','Bhaderwah','Sopore','Mandi'].map(c => ({ state: 'Jammu & Kashmir', district: c.includes('Surankote')||c.includes('Mendhar')||c.includes('Haveli')||c.includes('Mandi') ? 'Poonch' : c.includes('Sunderbani')||c.includes('Nowshera') ? 'Rajouri' : c.includes('Akhnoor') ? 'Jammu' : c.includes('Katra') ? 'Reasi' : c.includes('Bhaderwah') ? 'Doda' : c.includes('Sopore') ? 'Baramulla' : c, city: c })),

  // ═══ PUNJAB ═══
  ...['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Mansa','Moga','Mohali','Muktsar','Nawanshahr','Pathankot','Patiala','Rupnagar','Sangrur','Tarn Taran','Khanna','Phagwara','Rajpura','Zirakpur','Derabassi'].map(c => ({ state: 'Punjab', district: c.includes('Khanna') ? 'Ludhiana' : c.includes('Phagwara') ? 'Kapurthala' : c.includes('Rajpura') ? 'Patiala' : c.includes('Zirakpur')||c.includes('Derabassi') ? 'Mohali' : c, city: c })),

  // ═══ HARYANA ═══
  ...['Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh','Palwal','Panchkula','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'].map(c => ({ state: 'Haryana', district: c, city: c })),

  // ═══ DELHI ═══
  ...['New Delhi','Central Delhi','East Delhi','North Delhi','North East Delhi','North West Delhi','Shahdara','South Delhi','South East Delhi','South West Delhi','West Delhi','Dwarka','Rohini','Pitampura','Saket','Connaught Place'].map(c => ({ state: 'Delhi', district: c.includes('Dwarka')||c.includes('Rohini')||c.includes('Pitampura') ? 'North West Delhi' : c.includes('Saket') ? 'South Delhi' : c.includes('Connaught') ? 'New Delhi' : c, city: c })),

  // ═══ UTTAR PRADESH ═══
  ...['Agra','Aligarh','Allahabad','Ambedkar Nagar','Amethi','Amroha','Auraiya','Ayodhya','Azamgarh','Baghpat','Bahraich','Ballia','Balrampur','Banda','Barabanki','Bareilly','Basti','Bijnor','Budaun','Bulandshahr','Chandauli','Chitrakoot','Deoria','Etah','Etawah','Farrukhabad','Fatehpur','Firozabad','Gautam Buddh Nagar','Ghaziabad','Ghazipur','Gonda','Gorakhpur','Hamirpur','Hapur','Hardoi','Hathras','Jalaun','Jaunpur','Jhansi','Kannauj','Kanpur','Kasganj','Kaushambi','Kushinagar','Lakhimpur Kheri','Lalitpur','Lucknow','Maharajganj','Mahoba','Mainpuri','Mathura','Mau','Meerut','Mirzapur','Moradabad','Muzaffarnagar','Noida','Pilibhit','Pratapgarh','Rae Bareli','Rampur','Saharanpur','Sambhal','Sant Kabir Nagar','Shahjahanpur','Shamli','Shravasti','Siddharthnagar','Sitapur','Sultanpur','Unnao','Varanasi'].map(c => ({ state: 'Uttar Pradesh', district: c.includes('Noida') ? 'Gautam Buddh Nagar' : c, city: c })),

  // ═══ RAJASTHAN ═══
  ...['Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu','Dausa','Dholpur','Dungarpur','Hanumangarh','Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Kota','Nagaur','Pali','Pratapgarh','Rajsamand','Sawai Madhopur','Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'].map(c => ({ state: 'Rajasthan', district: c, city: c })),

  // ═══ MAHARASHTRA ═══
  ...['Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara','Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli','Jalgaon','Jalna','Kolhapur','Latur','Mumbai','Mumbai Suburban','Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar','Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara','Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal','Navi Mumbai','Kalyan'].map(c => ({ state: 'Maharashtra', district: c.includes('Navi Mumbai')||c.includes('Kalyan') ? 'Thane' : c, city: c })),

  // ═══ KARNATAKA ═══
  ...['Bagalkot','Ballari','Bangalore Rural','Bangalore Urban','Belagavi','Bidar','Chamarajanagar','Chikballapur','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mangaluru','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayapura','Yadgir','Hubli'].map(c => ({ state: 'Karnataka', district: c.includes('Mangaluru') ? 'Dakshina Kannada' : c.includes('Hubli') ? 'Dharwad' : c, city: c })),

  // ═══ TAMIL NADU ═══
  ...['Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kallakurichi','Kancheepuram','Kanyakumari','Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupathur','Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur','Vellore','Viluppuram','Virudhunagar'].map(c => ({ state: 'Tamil Nadu', district: c, city: c })),

  // ═══ KERALA ═══
  ...['Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod','Kollam','Kottayam','Kozhikode','Malappuram','Palakkad','Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad','Kochi'].map(c => ({ state: 'Kerala', district: c.includes('Kochi') ? 'Ernakulam' : c, city: c })),

  // ═══ TELANGANA ═══
  ...['Adilabad','Bhadradri Kothagudem','Hyderabad','Jagtial','Jangaon','Jayashankar','Jogulamba','Kamareddy','Karimnagar','Khammam','Komaram Bheem','Mahabubabad','Mahbubnagar','Mancherial','Medak','Medchal','Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal','Nizamabad','Peddapalli','Rajanna Sircilla','Rangareddy','Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy','Warangal','Yadadri','Secunderabad'].map(c => ({ state: 'Telangana', district: c.includes('Secunderabad') ? 'Hyderabad' : c, city: c })),

  // ═══ ANDHRA PRADESH ═══
  ...['Anantapur','Chittoor','East Godavari','Guntur','Krishna','Kurnool','Nellore','Prakasam','Srikakulam','Visakhapatnam','Vizianagaram','West Godavari','YSR Kadapa','Vijayawada','Tirupati','Kakinada'].map(c => ({ state: 'Andhra Pradesh', district: c.includes('Vijayawada') ? 'Krishna' : c.includes('Tirupati') ? 'Chittoor' : c.includes('Kakinada') ? 'East Godavari' : c, city: c })),

  // ═══ WEST BENGAL ═══
  ...['Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur','Siliguri','Salt Lake'].map(c => ({ state: 'West Bengal', district: c.includes('Siliguri') ? 'Darjeeling' : c.includes('Salt Lake') ? 'North 24 Parganas' : c, city: c })),

  // ═══ GUJARAT ═══
  ...['Ahmedabad','Amreli','Anand','Aravalli','Banaskantha','Bharuch','Bhavnagar','Botad','Chhota Udaipur','Dahod','Dang','Devbhoomi Dwarka','Gandhinagar','Gir Somnath','Jamnagar','Junagadh','Kheda','Kutch','Mahisagar','Mehsana','Morbi','Narmada','Navsari','Panchmahal','Patan','Porbandar','Rajkot','Sabarkantha','Surat','Surendranagar','Tapi','Vadodara','Valsad'].map(c => ({ state: 'Gujarat', district: c, city: c })),

  // ═══ MADHYA PRADESH ═══
  ...['Agar Malwa','Alirajpur','Anuppur','Ashoknagar','Balaghat','Barwani','Betul','Bhind','Bhopal','Burhanpur','Chhatarpur','Chhindwara','Damoh','Datia','Dewas','Dhar','Dindori','Guna','Gwalior','Harda','Hoshangabad','Indore','Jabalpur','Jhabua','Katni','Khandwa','Khargone','Mandla','Mandsaur','Morena','Narsinghpur','Neemuch','Panna','Raisen','Rajgarh','Ratlam','Rewa','Sagar','Satna','Sehore','Seoni','Shahdol','Shajapur','Sheopur','Shivpuri','Sidhi','Singrauli','Tikamgarh','Ujjain','Umaria','Vidisha'].map(c => ({ state: 'Madhya Pradesh', district: c, city: c })),

  // ═══ BIHAR ═══
  ...['Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar','Darbhanga','East Champaran','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur','Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali','West Champaran'].map(c => ({ state: 'Bihar', district: c, city: c })),

  // ═══ ODISHA ═══
  ...['Angul','Balangir','Balasore','Bargarh','Bhadrak','Bhubaneswar','Boudh','Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam','Jagatsinghpur','Jajpur','Jharsuguda','Kalahandi','Kandhamal','Kendrapara','Kendujhar','Khordha','Koraput','Malkangiri','Mayurbhanj','Nabarangpur','Nayagarh','Nuapada','Puri','Rayagada','Sambalpur','Subarnapur','Sundargarh'].map(c => ({ state: 'Odisha', district: c.includes('Bhubaneswar') ? 'Khordha' : c, city: c })),

  // ═══ CHHATTISGARH ═══
  ...['Balod','Baloda Bazar','Balrampur','Bastar','Bemetara','Bijapur','Bilaspur','Dantewada','Dhamtari','Durg','Gariaband','Janjgir-Champa','Jashpur','Kabirdham','Kanker','Kondagaon','Korba','Koriya','Mahasamund','Mungeli','Narayanpur','Raigarh','Raipur','Rajnandgaon','Sukma','Surajpur','Surguja'].map(c => ({ state: 'Chhattisgarh', district: c, city: c })),

  // ═══ JHARKHAND ═══
  ...['Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara','Jamshedpur','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahebganj','Seraikela Kharsawan','Simdega','West Singhbhum'].map(c => ({ state: 'Jharkhand', district: c.includes('Jamshedpur') ? 'East Singhbhum' : c, city: c })),

  // ═══ UTTARAKHAND ═══
  ...['Almora','Bageshwar','Chamoli','Champawat','Dehradun','Haridwar','Nainital','Pauri Garhwal','Pithoragarh','Rudraprayag','Tehri Garhwal','Udham Singh Nagar','Uttarkashi','Haldwani','Rishikesh','Mussoorie','Roorkee'].map(c => ({ state: 'Uttarakhand', district: c.includes('Haldwani') ? 'Nainital' : c.includes('Rishikesh')||c.includes('Roorkee') ? 'Haridwar' : c.includes('Mussoorie') ? 'Dehradun' : c, city: c })),

  // ═══ HIMACHAL PRADESH ═══
  ...['Bilaspur','Chamba','Hamirpur','Kangra','Kinnaur','Kullu','Lahaul Spiti','Mandi','Shimla','Sirmaur','Solan','Una','Dharamsala','Manali','Kasauli'].map(c => ({ state: 'Himachal Pradesh', district: c.includes('Dharamsala') ? 'Kangra' : c.includes('Manali') ? 'Kullu' : c.includes('Kasauli') ? 'Solan' : c, city: c })),

  // ═══ ASSAM ═══
  ...['Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo','Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao','Goalpara','Golaghat','Guwahati','Hailakandi','Hojai','Jorhat','Kamrup','Kamrup Metropolitan','Karbi Anglong','Karimganj','Kokrajhar','Lakhimpur','Majuli','Morigaon','Nagaon','Nalbari','Sivasagar','Sonitpur','South Salmara','Tinsukia','Udalguri','West Karbi Anglong'].map(c => ({ state: 'Assam', district: c.includes('Guwahati') ? 'Kamrup Metropolitan' : c, city: c })),

  // ═══ GOA ═══
  ...['North Goa','South Goa','Panaji','Margao','Vasco da Gama','Mapusa','Ponda'].map(c => ({ state: 'Goa', district: c.includes('Panaji')||c.includes('Mapusa') ? 'North Goa' : c.includes('Margao')||c.includes('Vasco')||c.includes('Ponda') ? 'South Goa' : c, city: c })),

  // ═══ CHANDIGARH ═══
  { state: 'Chandigarh', district: 'Chandigarh', city: 'Chandigarh' },

  // ═══ PUDUCHERRY ═══
  ...['Puducherry','Karaikal','Mahe','Yanam'].map(c => ({ state: 'Puducherry', district: c, city: c })),

  // ═══ LADAKH ═══
  ...['Leh','Kargil'].map(c => ({ state: 'Ladakh', district: c, city: c })),

  // ═══ MEGHALAYA ═══
  ...['East Garo Hills','East Jaintia Hills','East Khasi Hills','North Garo Hills','Ri Bhoi','Shillong','South Garo Hills','South West Garo Hills','South West Khasi Hills','West Garo Hills','West Jaintia Hills','West Khasi Hills'].map(c => ({ state: 'Meghalaya', district: c.includes('Shillong') ? 'East Khasi Hills' : c, city: c })),

  // ═══ MANIPUR ═══
  ...['Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul'].map(c => ({ state: 'Manipur', district: c, city: c })),

  // ═══ MIZORAM ═══
  ...['Aizawl','Champhai','Hnahthial','Khawzawl','Kolasib','Lawngtlai','Lunglei','Mamit','Saiha','Saitual','Serchhip'].map(c => ({ state: 'Mizoram', district: c, city: c })),

  // ═══ NAGALAND ═══
  ...['Chumoukedima','Dimapur','Kiphire','Kohima','Longleng','Mokokchung','Mon','Noklak','Peren','Phek','Shamator','Tseminyu','Tuensang','Wokha','Zunheboto'].map(c => ({ state: 'Nagaland', district: c, city: c })),

  // ═══ TRIPURA ═══
  ...['Dhalai','Gomati','Khowai','North Tripura','Sepahijala','South Tripura','Unakoti','West Tripura','Agartala'].map(c => ({ state: 'Tripura', district: c.includes('Agartala') ? 'West Tripura' : c, city: c })),

  // ═══ ARUNACHAL PRADESH ═══
  ...['Anjaw','Changlang','Dibang Valley','East Kameng','East Siang','Itanagar','Kamle','Kra Daadi','Kurung Kumey','Lepa Rada','Lohit','Longding','Lower Dibang Valley','Lower Siang','Lower Subansiri','Namsai','Pakke Kessang','Papum Pare','Shi Yomi','Siang','Tawang','Tirap','Upper Siang','Upper Subansiri','West Kameng','West Siang'].map(c => ({ state: 'Arunachal Pradesh', district: c.includes('Itanagar') ? 'Papum Pare' : c, city: c })),

  // ═══ SIKKIM ═══
  ...['East Sikkim','North Sikkim','South Sikkim','West Sikkim','Gangtok','Namchi'].map(c => ({ state: 'Sikkim', district: c.includes('Gangtok') ? 'East Sikkim' : c.includes('Namchi') ? 'South Sikkim' : c, city: c })),
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Remove old data and insert fresh
    await ServiceLocation.deleteMany({});
    console.log('Cleared old locations');

    await ServiceLocation.insertMany(LOCATIONS);
    console.log(`✅ Seeded ${LOCATIONS.length} locations across all Indian states`);

    // Log state count
    const states = await ServiceLocation.distinct('state');
    console.log(`States: ${states.length}`);
    states.forEach(s => console.log(`  - ${s}`));

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
