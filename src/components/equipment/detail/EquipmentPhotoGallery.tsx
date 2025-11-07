interface Photo {
  id: string;
  photo_url: string;
}

interface EquipmentPhotoGalleryProps {
  photos: Photo[];
  equipmentTitle: string;
}

export const EquipmentPhotoGallery = ({
  photos,
  equipmentTitle,
}: EquipmentPhotoGalleryProps) => {
  if (photos.length === 0) {
    return null;
  }

  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 5); // Up to 4 secondary photos

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-2 h-[300px] sm:h-[400px] md:h-[500px]">
        {/* Primary large image */}
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={primaryPhoto.photo_url}
            alt={equipmentTitle}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </div>

        {/* Secondary images grid */}
        {secondaryPhotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {secondaryPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                className="relative rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={photo.photo_url}
                  alt={`${equipmentTitle} - ${idx + 2}`}
                  className="w-full h-full object-cover cursor-pointer group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
                {photos.length > 5 && idx === 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                    +{photos.length - 5} more
                  </div>
                )}
              </div>
            ))}
            {/* Fill empty cells if needed */}
            {secondaryPhotos.length < 4 &&
              Array.from({ length: 4 - secondaryPhotos.length }).map(
                (_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-lg border border-border bg-muted"
                    aria-hidden="true"
                  />
                )
              )}
          </div>
        )}
      </div>
    </div>
  );
};

