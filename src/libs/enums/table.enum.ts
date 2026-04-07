export enum TableStatus {
    AVAILABLE = "AVAILABLE",
    OCCUPIED = "OCCUPIED",
    CLEANING = "CLEANING",
}

/** Tavsiya etilgan qiymatlar; API `tableKind` ni ixtiyoriy string qabul qiladi */
export enum TableKind {
    TABLE = "TABLE",
    CARAVAN = "CARAVAN",
    ROOM = "ROOM",
    SOFA = "SOFA",
}