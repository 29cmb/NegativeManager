import argon2 from 'argon2';

export const argon2encrypt = async (password: string) => {
    try {
        const hash = await argon2.hash(password)
        console.log(hash)
        return hash
    } catch (err) {
        console.log("❌ | Error hashing password:", err)
        return null
    }
}

export const argon2verify = async (password: string, hash: string) => {
    try {
        return await argon2.verify(hash, password)
    } catch (err) {
        console.log("❌ | Error verifying password:", err)
        return false
    }
}