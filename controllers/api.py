import tempfile

# Cloud-safe of uuid, so that many cloned servers do not all use the same uuids.
from gluon.utils import web2py_uuid

# Here go your api methods.

@auth.requires_signature(hash_vars=False)
def get_tracks():
    start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
    end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0
    images = []
    rows = db().select(db.user_images.ALL, limitby=(start_idx, end_idx + 1))
    for i, r in enumerate(rows):
        if i < end_idx - start_idx:
            t = dict(
                created_by = r.created_by,
                created_on = r.created_on,
            )
            images.append(t)
        else:

    logged_in = auth.user is not None
    return response.json(dict(
        iamges=images,
        logged_in=logged_in,
    ))


@auth.requires_signature()
def add_image():
    """Received the metadata for a new image."""
    # Inserts the image information.
    t_id = db.user_images.insert(
        created_by = request.vars.created_by,
        created_on = request.vars.created_on,
        img_url = request.vars.img_url
    )
    # Returns the image info.  Building the dict should likely be done in
    # a shared function, but oh well.
    return response.json(dict(track=dict(
        created_by = request.vars.created_by,
        created_on = request.vars.created_on,
        img_url = request.vars.image_url
    )))
