// College information used across the UI. Change values here to rebrand the app.

export const college = {
  name: "P.T. Lee Chengalvaraya Naicker College of Engineering and Technology",
  shortName: "College AI",
  tagline: "Your Smart Campus Assistant",
  altTagline: "Ask. Learn. Discover.",
  established: 1984,
  address: "Chengalpattu, Tamil Nadu, India",
  contact: {
    phone: "+91 44 2742 0000",
    email: "info@ptlcncet.edu.in",
    website: "www.ptlcncet.edu.in",
  },
};


export const departments = [
  { name: "Information Technology", code: "IT", emoji: "💻", color: "blue" },
  { name: "Computer Science & Engineering", code: "CSE", emoji: "🖥️", color: "indigo" },
  { name: "AI & Data Science", code: "AI&DS", emoji: "🧠", color: "violet" },
  { name: "Electronics & Communication", code: "ECE", emoji: "📡", color: "rose" },
  { name: "Electrical & Electronics", code: "EEE", emoji: "⚡", color: "amber" },
  { name: "Mechanical Engineering", code: "MECH", emoji: "⚙️", color: "slate" },
  { name: "Science & Humanities", code: "S&H", emoji: "🔬", color: "emerald" },
];

export const campusFeatures = [
  { name: "Departments", emoji: "🏛️", desc: "7 specialized engineering departments" },
  { name: "Laboratories", emoji: "🧪", desc: "Modern labs with the latest equipment" },
  { name: "Library", emoji: "📖", desc: "Extensive digital & print resources" },
  { name: "Hostel", emoji: "🏠", desc: "Comfortable accommodation for students" },
  { name: "Transport", emoji: "🚌", desc: "Bus routes across the city & suburbs" },
  { name: "Placement Cell", emoji: "💼", desc: "Dedicated career guidance & training" },
  { name: "Clubs", emoji: "🎭", desc: "Technical & cultural student clubs" },
  { name: "Events", emoji: "🎉", desc: "Technical symposiums & cultural fests" },
];

export const suggestionCards = [
  { title: "Academics", emoji: "🎓", desc: "Courses, departments and curriculum", query: "What courses are offered?", color: "blue" },
  { title: "Placements", emoji: "💼", desc: "Companies, training and career opportunities", query: "What are the placement opportunities?", color: "amber" },
  { title: "Campus", emoji: "🏫", desc: "Facilities, labs and infrastructure", query: "What facilities are available?", color: "rose" },
  { title: "Activities", emoji: "🎉", desc: "Events, clubs and student activities", query: "What clubs are available?", color: "violet" },
  { title: "Library", emoji: "📖",desc: "Extensive digital & print resources", query: "Where is the IT Lab?", color: "emerald" },
  { title: "Transport", emoji: "🚌", desc: "Routes and transportation information", query: "Is transportation available?", color: "cyan" },
];

export const quickChips = [
  { label: "Departments & Courses", emoji: "📚", query: "What departments are available?", color: "blue" },
  { label: "Campus Facilities", emoji: "🏫", query: "What facilities are available?", color: "emerald" },
  { label: "Placements", emoji: "💼", query: "What are the placement opportunities?", color: "amber" },
  { label: "Admissions", emoji: "🎓", query: "What are the admission requirements?", color: "violet" },
  { label: "College Events", emoji: "🎉", query: "What events are happening?", color: "rose" },
  { label: "Contact Info", emoji: "📞", query: "How can I contact the college?", color: "cyan" },
];

// ---- Campus Map / Directions data ----
export const mapLocations = [
  "Main Gate",
  "Library",
  "Admin Block",
  "Canteen",
  "IT Department",
  "CSE Department",
  "Hostel",
  "Sports Ground",
];

export const mapPeople = [
  { id: "principal", name: "Principal", block: "Admin Block", floor: "1st Floor", room: "Room 101", hint: "Take the stairs near the reception to the 1st floor — the Principal's office is the first door on the right." },
  { id: "hod_it", name: "HOD IT — Dr. R. Saravanan", block: "IT Department", floor: "1st Floor", room: "Room 105", hint: "Enter the IT block and take the stairs to the 1st floor — the HOD's cabin is at the end of the corridor." },
  { id: "hod_cse", name: "HOD CSE", block: "CSE Department", floor: "2nd Floor", room: "Room 201", hint: "Go to the CSE block and take the stairs to the 2nd floor — the HOD's office is the second door on the left." },
  { id: "hod_ece", name: "HOD ECE", block: "ECE Department", floor: "1st Floor", room: "Room 110", hint: "Enter the ECE block and go to the 1st floor — the HOD's cabin is beside the ECE lab." },
  { id: "hod_eee", name: "HOD EEE", block: "EEE Department", floor: "1st Floor", room: "Room 108", hint: "Go to the EEE block, 1st floor — the HOD's office is next to the machines lab." },
  { id: "placement", name: "Placement Officer", block: "Admin Block", floor: "Ground Floor", room: "Placement Cell", hint: "Enter the Admin Block — the Placement Cell is the glass-door office on the ground floor, beside the reception." },
  { id: "librarian", name: "Librarian", block: "Library", floor: "Ground Floor", room: "Library Office", hint: "Walk into the library — the Librarian's office is at the far end of the reading hall." },
  { id: "accounts", name: "Accounts Officer", block: "Admin Block", floor: "Ground Floor", room: "Room 003", hint: "In the Admin Block, the Accounts section is the third door on the left of the reception." },
  { id: "transport", name: "Transport Officer", block: "Admin Block", floor: "Ground Floor", room: "Room 005", hint: "In the Admin Block, the Transport Office is the last door on the left of the reception." },
];

export function getDirections(from, personId) {
  const person = mapPeople.find((p) => p.id === personId);
  if (!person) return null;
  const sameBlock = from.toLowerCase().includes(person.block.split(" ")[0].toLowerCase());
  const steps = [
    `Start at **${from}**.`,
    sameBlock
      ? `You're already at the **${person.block}**.`
      : `Make your way to the **${person.block}**.`,
    person.hint,
  ];
  return {
    person,
    content: `## 📍 Directions to ${person.name}

**From:** ${from}
**To:** ${person.name}
**Location:** ${person.block}, ${person.floor} — ${person.room}

${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    source: {
      label: "Campus Map & Directory",
      document: "Campus Directory 2024-25",
      snippet: `${person.name} is located at ${person.block}, ${person.floor} — ${person.room}.`,
    },
  };
}
