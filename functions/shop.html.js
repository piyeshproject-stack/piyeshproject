export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    url.pathname = '/shop';
    return Response.redirect(url.toString(), 301);
}
