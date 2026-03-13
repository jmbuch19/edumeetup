import { registerStudentSchema } from './lib/schemas'

const data = {
    email: 'test@example.com',
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
    gmatScore: ''
}

const res = registerStudentSchema.safeParse(data)
if (!res.success) {
    console.error(res.error.flatten().fieldErrors)
} else {
    console.log("Success")
}
