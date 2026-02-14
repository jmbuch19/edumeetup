export const PRIORITY_MARKETS = [
    {
        tier: 1,
        label: "Core Focus Markets",
        countries: [
            { name: "India", code: "IN", priority: "high", paymentZone: "SouthAsia" },
            { name: "Bangladesh", code: "BD", priority: "high", paymentZone: "SouthAsia" },
            { name: "Nepal", code: "NP", priority: "high", paymentZone: "SouthAsia" },
            { name: "Sri Lanka", code: "LK", priority: "high", paymentZone: "SouthAsia" },
            { name: "Vietnam", code: "VN", priority: "high", paymentZone: "SEA" },
            { name: "Nigeria", code: "NG", priority: "high", paymentZone: "Africa" },
            { name: "Kenya", code: "KE", priority: "high", paymentZone: "Africa" },
            { name: "United Arab Emirates", code: "AE", priority: "high", paymentZone: "MiddleEast" },
            // Added manually based on "United State of America, United Kingdom, Australia, Germany, Canada" request
            { name: "United States", code: "US", priority: "high", paymentZone: "NorthAmerica" },
            { name: "United Kingdom", code: "GB", priority: "high", paymentZone: "Europe" },
            { name: "Australia", code: "AU", priority: "high", paymentZone: "Oceania" },
            { name: "Germany", code: "DE", priority: "high", paymentZone: "Europe" },
            { name: "Canada", code: "CA", priority: "high", paymentZone: "NorthAmerica" },
        ]
    },
    {
        tier: 2,
        label: "Growth Markets",
        countries: [
            { name: "Saudi Arabia", code: "SA", priority: "medium", paymentZone: "MiddleEast" },
            { name: "Qatar", code: "QA", priority: "medium", paymentZone: "MiddleEast" },
            { name: "Brazil", code: "BR", priority: "medium", paymentZone: "LatinAmerica" },
            { name: "Mexico", code: "MX", priority: "medium", paymentZone: "LatinAmerica" },
            { name: "Indonesia", code: "ID", priority: "medium", paymentZone: "SEA" },
            { name: "Philippines", code: "PH", priority: "medium", paymentZone: "SEA" }
        ]
    },
    {
        tier: 3,
        label: "Strategic Expansion Markets",
        countries: [
            { name: "China", code: "CN", priority: "long-term", paymentZone: "EastAsia" },
            { name: "South Korea", code: "KR", priority: "long-term", paymentZone: "EastAsia" },
            { name: "Japan", code: "JP", priority: "long-term", paymentZone: "EastAsia" },
            { name: "Colombia", code: "CO", priority: "long-term", paymentZone: "LatinAmerica" },
            { name: "Peru", code: "PE", priority: "long-term", paymentZone: "LatinAmerica" }
        ]
    }
];

export const ALL_COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad", "Chile", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Holy See", "Honduras", "Hungary",
    "Iceland", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Jordan",
    "Kazakhstan", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
    "Namibia", "Nauru", "Netherlands", "New Zealand", "Nicaragua", "Niger", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Poland", "Portugal",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "Uruguay", "Uzbekistan",
    "Vanuatu", "Venezuela",
    "Yemen",
    "Zambia", "Zimbabwe"
];
