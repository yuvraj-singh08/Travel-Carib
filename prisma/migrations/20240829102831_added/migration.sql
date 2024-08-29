-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "profilePhoto" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoTravellers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "CoTravellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "ContactDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "issuingCountry" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "passportImage" TEXT NOT NULL,

    CONSTRAINT "PassportDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrequentFlyerDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequentFlyerNumber" TEXT NOT NULL,
    "airline" TEXT NOT NULL,

    CONSTRAINT "FrequentFlyerDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "addressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "identityCard" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContactDetail_userId_key" ON "ContactDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PassportDetail_userId_key" ON "PassportDetail"("userId");

-- CreateIndex
CREATE INDEX "FrequentFlyerDetail_userId_idx" ON "FrequentFlyerDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Passenger_addressId_key" ON "Passenger"("addressId");

-- AddForeignKey
ALTER TABLE "CoTravellers" ADD CONSTRAINT "CoTravellers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactDetail" ADD CONSTRAINT "ContactDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportDetail" ADD CONSTRAINT "PassportDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrequentFlyerDetail" ADD CONSTRAINT "FrequentFlyerDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
