
export async function uploadFileToPinata(file) {
    const jwt = import.meta.env.VITE_PINATA_JWT;
    if (!jwt) {
        throw new Error('VITE_PINATA_JWT environment variable is missing.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
        name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Pinata upload failed: ${res.status} ${errorText}`);
        }

        const resData = await res.json();
        return resData.IpfsHash;
    } catch (error) {
        console.error("Pinata Upload Error:", error);
        throw error;
    }
}
