import tempfile

# Cloud-safe of uuid, so that many cloned servers do not all use the same uuids.
from gluon.utils import web2py_uuid

def add_image():
    """Received the metadata for a new image."""
    # Inserts the image information.
    image_id = db.user_images.insert(image_url = request.vars.get_urls,
                            price=request.vars.img_price)
    t = db.user_images(image_id)
    return response.json(dict(images=t))


def get_users():
    images=[]
    users=[]
    for r in db(db.auth_user.id == auth.user_id).select():
        t=dict(
            user_id=r.id,
            fName=r.first_name,
            lName=r.last_name,
        )
        users.append(t)

    for r in db(db.auth_user.id != auth.user_id).select():
        t=dict(
            user_id=r.id,
            fName=r.first_name,
            lName=r.last_name,
        )
        users.append(t)

    for r in db(db.user_images.created_by == auth.user_id).select(orderby=~db.user_images.created_on):
        t = dict(
            image_url = r.image_url,
            created_by = r.created_by,
            price = r.price,
            id = r.id
        )
        images.append(t)
    is_logged_in = auth.user is not None
    return response.json(dict(
        users = users,
        images = images,
        logged_in = is_logged_in,
    ))


def specific_images():
    qu = (db.user_images.created_by == request.vars.user_ids)
    qp = db(qu).select(orderby=~db.user_images.created_on)
    return response.json(dict(images = qp))

def update_price():
    q = db(db.user_images.id == request.vars.img_id).select().first()
    q.update_record(
        price = request.vars.img_price
    )
