
export const DaysOfWeek = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
] as const

export const MeetingDurations = [10, 15, 20] as const

export const VideoProviders = [
    { value: 'GOOGLE_MEET', label: 'Google Meet' },
    { value: 'ZOOM', label: 'Zoom' },
    { value: 'EXTERNAL_LINK', label: 'External Link' },
] as const

export const DegreeLevels = [
    { value: "Associate", label: "Associate" },
    { value: "Bachelor's", label: "Bachelor's" },
    { value: "Master's", label: "Master's" },
    { value: "MBA", label: "MBA" },
    { value: "PhD", label: "PhD" },
    { value: "Certificate", label: "Certificate" },
] as const

export const MeetingPurposes = [
    { value: 'ADMISSION_QUERY', label: 'Admission Query' },
    { value: 'PROGRAM_FIT', label: 'Program Fit' },
    { value: 'SCHOLARSHIP_INFO', label: 'Scholarship Info' },
    { value: 'DOCUMENT_HELP', label: 'Document Help' },
    { value: 'APPLICATION_STATUS', label: 'Application Status' },
    { value: 'OTHER', label: 'Other' },
] as const

export const FIELD_CATEGORIES = [
    "Computer Science",
    "Engineering",
    "Business",
    "Data Science",
    "Health Sciences",
    "Social Sciences",
    "Arts & Humanities",
    "Law",
    "Architecture",
    "Others"
] as const
