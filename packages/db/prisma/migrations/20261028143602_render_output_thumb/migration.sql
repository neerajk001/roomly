-- AlterTable
ALTER TABLE "RenderOutput" ADD COLUMN     "thumbAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "RenderOutput" ADD CONSTRAINT "RenderOutput_thumbAssetId_fkey" FOREIGN KEY ("thumbAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
