export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    url.pathname = '/product';
    return Response.redirect(url.toString(), 301);
}
