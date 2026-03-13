import { studentProfileSchema } from './lib/schemas'

const data = {
    fullName: 'Test User',
    country: 'India',
    gender: 'Male',
    ageGroup: '21-25',
    city: 'Mumbai',
    pincode: '400001',
    englishTestType: 'Not Taken Yet',
    englishScore: '',
    greTaken: 'no',
    greScore: '',
    gmatTaken: 'no',
    gmatScore: '',
    testsTaken: []
}

const res = studentProfileSchema.safeParse(data)
if (!res.success) {
    console.error(res.error.flatten().fieldErrors)
} else {
    console.log("Success")
}
