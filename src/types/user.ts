export interface User {
    id: string;
    phone: string;
    password: string; // hashed
    role: 'ADMIN';
}
