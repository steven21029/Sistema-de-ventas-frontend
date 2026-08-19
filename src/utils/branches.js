const CITY_GROUPS = [
  {
    key: "distrito-central",
    label: "Distrito Central",
    aliases: ["distrito central", "tegucigalpa", "comayaguela"],
    prefixes: ["dc", "teg", "tgu"],
  },
  {
    key: "comayagua",
    label: "Comayagua",
    aliases: ["comayagua"],
    prefixes: ["com", "cmy"],
  },
  {
    key: "san-pedro-sula",
    label: "San Pedro Sula",
    aliases: ["san pedro sula", "san pedro"],
    prefixes: ["sps"],
  },
  {
    key: "choluteca",
    label: "Choluteca",
    aliases: ["choluteca"],
    prefixes: ["chl", "cho"],
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getBranchCityValue(item) {
  const city = item?.ciudad;

  if (city && typeof city === "object") {
    return city.nombre || city.name || "";
  }

  return city || item?.ciudad_nombre || item?.municipio || "";
}

function getBranchCityGroup(item) {
  const cityValue = String(getBranchCityValue(item) || "").trim();
  const normalizedCity = normalizeText(cityValue);
  const normalizedName = normalizeText(item?.nombre);
  const cityGroup = CITY_GROUPS.find((group) =>
    group.aliases.some((alias) => normalizedCity.includes(alias)),
  );

  if (cityGroup) {
    return cityGroup;
  }

  if (!normalizedCity) {
    const prefixGroup = CITY_GROUPS.find((group) =>
      group.prefixes.some((prefix) =>
        new RegExp(`^${prefix}\\s*[-:–—]`).test(normalizedName),
      ),
    );

    if (prefixGroup) {
      return prefixGroup;
    }
  }

  return {
    key: normalizeText(cityValue).replace(/\s+/g, "-") || "otras-ciudades",
    label: cityValue || "Otras ciudades",
  };
}

export function groupBranchesByCity(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const cityGroup = getBranchCityGroup(item);

    if (!groups.has(cityGroup.key)) {
      groups.set(cityGroup.key, { ...cityGroup, items: [] });
    }

    groups.get(cityGroup.key).items.push(item);
  });

  const knownGroups = CITY_GROUPS
    .map((group) => groups.get(group.key))
    .filter(Boolean);
  const additionalGroups = Array.from(groups.values())
    .filter((group) => !CITY_GROUPS.some((knownGroup) => knownGroup.key === group.key))
    .sort((first, second) => first.label.localeCompare(second.label, "es"));

  return knownGroups.concat(additionalGroups);
}

export function getVisibleBranchName(value) {
  return String(value || "")
    .replace(
      /^\s*(?:[A-ZÁÉÍÓÚÑ0-9]{2,5}|(?:Distrito Central|Tegucigalpa|Comayag(?:ua|üa)|San Pedro(?: Sula)?|Choluteca))\s*[-:–—]\s*/,
      "",
    )
    .trim();
}
