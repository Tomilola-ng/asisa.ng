export type Executive = {
  id: string;
  name: string;
  role: string;
  image: string;
};

/** Leadership ordered by office for display. */
export const EXECUTIVES: Executive[] = [
  {
    id: "president",
    name: "Akande Kehinde",
    role: "President",
    image: "/executives/akande-kehinde.jpg",
  },
  {
    id: "vice-president",
    name: "Asenuga Oluwamuyiwa",
    role: "Vice President",
    image: "/executives/asenuga-oluwamuyiwa.jpg",
  },
  {
    id: "general-secretary",
    name: "Onoja Happiness",
    role: "General Secretary",
    image: "/executives/onoja-happiness.jpg",
  },
  {
    id: "assistant-general-secretary",
    name: "Adebiyi Adeola",
    role: "Assistant General Secretary",
    image: "/executives/adebiyi-adeola.jpg",
  },
  {
    id: "financial-secretary",
    name: "Alawode Oluwapelumi",
    role: "Financial Secretary",
    image: "/executives/alawode-oluwapelumi.jpg",
  },
  {
    id: "treasurer",
    name: "Oloyede Ayodele",
    role: "Treasurer",
    image: "/executives/oloyede-ayodele.jpg",
  },
  {
    id: "social-secretary",
    name: "Adetunji Abdulrasaq",
    role: "Social Secretary",
    image: "/executives/adetunji-abdulrasaq.jpg",
  },
  {
    id: "welfare-secretary",
    name: "Ojelabi Dasola",
    role: "Welfare Secretary",
    image: "/executives/ojelabi-dasola.jpg",
  },
  {
    id: "sport-secretary",
    name: "Onifade Olabanji",
    role: "Sport Secretary",
    image: "/executives/onifade-olabanji.jpg",
  },
  {
    id: "public-relations-officer",
    name: "Ajibola Ayomide",
    role: "Public Relations Officer",
    image: "/executives/ajibola-ayomide.jpg",
  },
];

export const EXECUTIVES_GROUP_IMAGE = "/executives/group.jpg";
