import React, { useEffect, useState } from 'react';

// Libraries
import {
  Button,
  Box,
  makeStyles,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
} from '@material-ui/core';
import ImageUploader from 'react-images-upload';
import firebase from 'firebase/app';
import 'firebase/firestore';
import jimp from 'jimp';
import download from 'downloadjs';
import html2canvas from 'html2canvas';

// Components
import FrameCarousel from '../components/carousel/Carousel';
import CustomTextField from '../components/shared/TextField';

// Utils
import getCroppedImage from '../utils/cropImage';
import { determineTextboxDimensions } from '../utils/helpers';

// Assets
import { FrameData } from '../utils/types';

const App: React.FC = () => {
  const [uploadImage, setUploadImage] = useState<null | File>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [aspect] = useState<number>(1 / 1);

  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [frame, setFrame] = useState<FrameData | null>(null);
  const [greyscale, setGreyScale] = useState<boolean>(false);
  const [textBoxDimensions, setTextBoxDimensions] = useState<any>();

  const [primaryText, setPrimaryText] = useState<string>('Primary Text');
  const [secondaryText, setSecondaryText] = useState<string>('Secondary Text');
  const [position, setPosition] = useState<string>('top-right');

  const [data, setData] = useState<FrameData[] | null>(null);
  const classes = useStyles();

  useEffect(() => {
    firebase
      .firestore()
      .collection('frames')
      .where('approved', '==', true)
      .get()
      .then((query: any) => {
        let frames: any = [];

        query.forEach((frame: any) => {
          frames.push(frame.data());
        });
        setData(frames);
        setFrame(frames[0]);
      });
  }, []);

  const handlePositionChange = (event: React.ChangeEvent<{ value: unknown }>) =>
    setPosition(event.target.value as string);

  const handleGreyscaleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setGreyScale(event.target.checked);
  };

  const overlayImage = async () => {
    if (frame) {
      console.log('start');
      const {
        dimensions: { width, height, top, bottom, right, left },
      } = frame;

      const cropImage = await getCroppedImage(
        URL.createObjectURL(uploadImage),
        croppedAreaPixels
      );

      const image1 = await jimp.read(frame.frame);
      const frameImage = image1.resize(width, height);

      const image2 = await jimp.read(cropImage);
      const profile = image2.resize(
        width - right - left,
        height - top - bottom
      );

      if (greyscale) profile.greyscale();

      // @ts-ignore
      html2canvas(document.querySelector('#custom-text-box')).then(
        async (canvas) => {
          const url = canvas.toDataURL();

          const {
            width: textBoxWidth,
            height: textBoxHeight,
          } = determineTextboxDimensions(
            textBoxDimensions.width,
            textBoxDimensions.height,
            width - right - left,
            height - top - bottom
          );

          const textbox = await jimp.read(url);
          const textBox = textbox.resize(textBoxWidth, textBoxHeight);

          let x, y;
          if (position === 'top-right') {
            y = top;
            x = width - right - textBoxWidth;
          } else if (position === 'top-left') {
            y = top;
            x = left;
          } else if (position === 'bottom-right') {
            y = height - bottom - textBoxHeight;
            x = width - right - textBoxWidth;
          } else if (position === 'bottom-left') {
            y = height - bottom - textBoxHeight;
            x = left;
          }

          frameImage
            .composite(profile, top, left)
            // @ts-ignore
            .composite(textBox, x, y)
            // @ts-ignore
            .getBase64(jimp.AUTO, async (err: any, src: any) => {
              download(src, 'profile-frame.png', 'image/png');
              console.log('end');
            });
        }
      );
    }
  };

  return (
    <div style={{ minHeight: window.innerHeight }}>
      <Box className={classes.features}>
        <FormControlLabel
          control={
            <Switch
              checked={greyscale}
              onChange={handleGreyscaleChange}
              name='greyscale'
              color='primary'
            />
          }
          label='Grayscale'
        />

        <CustomTextField
          value={primaryText}
          setValue={setPrimaryText}
          label='Primary Text'
          type='text'
          className={classes.textInput}
        />

        <CustomTextField
          value={secondaryText}
          setValue={setSecondaryText}
          label='Secondary Text'
          type='text'
          className={classes.textInput}
        />

        <Select
          label='Frame Shape'
          onChange={handlePositionChange}
          value={position}
          variant='outlined'
          style={{ width: '100%', marginTop: 20 }}
        >
          <MenuItem value='top-right'>Top Right</MenuItem>
          <MenuItem value='top-left'>Top Left</MenuItem>
          <MenuItem value='bottom-right'>Bottom Right</MenuItem>
          <MenuItem value='bottom-left'>Bottom Left</MenuItem>
        </Select>

        <ImageUploader
          className={classes.upload}
          withIcon={false}
          withLabel={false}
          buttonText='CHOOSE IMAGE'
          imgExtension={['.jpg', '.gif', '.png', '.gif', '.jpeg']}
          maxFileSize={5242880 * 2}
          singleImage={true}
          fileContainerStyle={{
            height: 'fit-content',
            boxShadow: 'none',
            backgroundColor: 'transparent',
          }}
          buttonClassName={classes.buttonStyles}
          onChange={(picture: File[]) => {
            setUploadImage(picture[0]);
          }}
        />

        <Button onClick={overlayImage} variant='contained' color='secondary'>
          Download
        </Button>
      </Box>

      <Box className={classes.frame}>
        {data !== null ? (
          <FrameCarousel
            uploadImage={uploadImage}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            setCrop={setCrop}
            setZoom={setZoom}
            data={data}
            primaryText={primaryText}
            secondaryText={secondaryText}
            position={position}
            setCroppedAreaPixels={setCroppedAreaPixels}
            setFrame={setFrame}
            setTextBoxDimenstions={setTextBoxDimensions}
          />
        ) : (
          <h2>Loading...</h2>
        )}
      </Box>
    </div>
  );
};

export default App;

const useStyles = makeStyles((theme) => ({
  features: {
    transform: 'translate(-50%,-50%)',
    position: 'absolute',
    right: '5%',
    top: '50%',
    zIndex: 10,
    height: '60%',
    width: '350px',
    backgroundImage: '#334d50',
    background: 'linear-gradient(to right, #FDC830, #F37335)',
    padding: '1rem',
    borderRadius: '5px',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 20,
    [theme.breakpoints.down('sm')]: {
      left: '50%',
      top: '70%',
      width: '320px',
    },
  },
  frame: {
    width: '100%',
    minHeight: window.innerHeight + 50,
    zIndex: 0,
  },
  upload: {
    width: 'auto',
  },
  buttonStyles: {
    backgroundColor: '#3F51B5',
    width: '100%',
    height: 'fit-content',
    margin: 0,
  },
  textInput: {
    marginTop: 20,
    color: '#fff',
  },
}));