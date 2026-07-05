self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share-receiver') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');
        if (imageFile) {
          const cache = await caches.open('shared-images-cache');
          await cache.put('shared-image', new Response(imageFile));
        }
      } catch (e) {
        console.error('Share target error:', e);
      }
      return Response.redirect('/?share-target=image', 303);
    })());
  }
});